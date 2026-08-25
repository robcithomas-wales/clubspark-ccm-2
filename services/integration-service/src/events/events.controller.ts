import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'
import { WebhookDeliveriesService } from '../webhook-deliveries/webhook-deliveries.service.js'
import { AccountingSyncService } from '../accounting-sync/accounting-sync.service.js'
import type { DomainEvent } from './domain-events.js'
import { EventInboxService, type InboxOutcome } from './event-inbox.service.js'

/**
 * Turn an inbox outcome into the answer the producer needs.
 *
 * A refused claim must NOT be acknowledged: the relay marks the outbox row
 * published on any 2xx, so acking "busy" drops the event entirely.
 */
function ackOrRetry(outcome: InboxOutcome, type: string): void {
  if (outcome === 'processed' || outcome === 'duplicate') return
  if (outcome === 'payloadConflict') {
    throw new ConflictException(
      `Event ${type} was already received with a different payload — same eventId, changed content`,
    )
  }
  throw new ServiceUnavailableException(
    `Event ${type} is being processed by another worker — retry`,
  )
}

@ApiTags('events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  private readonly logger = new Logger(EventsController.name)

  constructor(
    private readonly deliveries: WebhookDeliveriesService,
    private readonly accountingSync: AccountingSyncService,
    private readonly inbox: EventInboxService,
  ) {}

  @Post('inbound')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @ApiSecurity('internal-secret')
  @ApiOperation({ summary: 'Inbound domain event (pilot: HTTP; production: Azure Service Bus)' })
  async inbound(@Body() event: DomainEvent): Promise<{ received: boolean }> {
    this.logger.log(`[Inbound] ${event.type} — tenant ${event.tenantId}`)

    const outcome = await this.inbox.process(event, async () => {
      // Do not acknowledge the publisher until durable downstream work has been
      // recorded. A rejected handler causes the source outbox to retry.
      const work: Promise<void>[] = [this.deliveries.dispatch(event)]

      // Accounting handlers persist their sync log before this request is acknowledged.
      if (event.type === 'payment.succeeded') {
        work.push(
          this.accountingSync.onPaymentSucceeded({
            paymentId: event['paymentId'] as string,
            tenantId: event.tenantId,
            memberName: (event['memberName'] as string) ?? 'Member',
            memberEmail: (event['memberEmail'] as string) ?? '',
            amountPence: (event['amountPence'] as number) ?? 0,
            currency: (event['currency'] as string) ?? 'GBP',
            description: (event['description'] as string) ?? 'Payment',
            reference: event['reference'] as string | undefined,
          }),
        )
      }

      if (event.type === 'payment.refund_issued') {
        work.push(
          this.accountingSync.onPaymentRefundIssued({
            paymentId: event['paymentId'] as string,
            refundId: (event['refundId'] as string) ?? (event['paymentId'] as string),
            tenantId: event.tenantId,
            memberName: (event['memberName'] as string) ?? 'Member',
            memberEmail: (event['memberEmail'] as string) ?? '',
            amountPence: (event['amountPence'] as number) ?? 0,
            currency: (event['currency'] as string) ?? 'GBP',
            description: (event['description'] as string) ?? 'Refund',
          }),
        )
      }

      if (event.type === 'membership.activated') {
        work.push(
          this.accountingSync.onMembershipActivated({
            membershipId: event['membershipId'] as string,
            tenantId: event.tenantId,
            memberName: (event['memberName'] as string) ?? 'Member',
            memberEmail: (event['memberEmail'] as string) ?? '',
            amountPence: (event['amountPence'] as number) ?? 0,
            currency: (event['currency'] as string) ?? 'GBP',
            planName: (event['planName'] as string) ?? 'Membership',
          }),
        )
      }

      await Promise.all(work)
    })
    ackOrRetry(outcome, event.type)
    return { received: true }
  }
}
