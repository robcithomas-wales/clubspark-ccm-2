import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'
import { WebhookDeliveriesService } from '../webhook-deliveries/webhook-deliveries.service.js'
import { AccountingSyncService } from '../accounting-sync/accounting-sync.service.js'
import type { DomainEvent } from './domain-events.js'
import { EventInboxService } from './event-inbox.service.js'

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

    await this.inbox.process(event, async () => {
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
    return { received: true }
  }
}
