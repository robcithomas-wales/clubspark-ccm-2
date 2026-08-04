import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'
import { WebhookDeliveriesService } from '../webhook-deliveries/webhook-deliveries.service.js'
import { AccountingSyncService } from '../accounting-sync/accounting-sync.service.js'
import type { DomainEvent } from './domain-events.js'

@ApiTags('events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  private readonly logger = new Logger(EventsController.name)

  constructor(
    private readonly deliveries: WebhookDeliveriesService,
    private readonly accountingSync: AccountingSyncService,
  ) {}

  @Post('inbound')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @ApiSecurity('internal-secret')
  @ApiOperation({ summary: 'Inbound domain event (pilot: HTTP; production: Azure Service Bus)' })
  async inbound(@Body() event: DomainEvent): Promise<{ received: boolean }> {
    this.logger.log(`[Inbound] ${event.type} — tenant ${event.tenantId}`)

    // Webhook dispatch (fire-and-forget)
    void this.deliveries.dispatch(event)

    // Accounting sync (fire-and-forget — errors are logged per sync-log row)
    if (event.type === 'payment.succeeded') {
      void this.accountingSync.onPaymentSucceeded({
        paymentId: event['paymentId'] as string,
        tenantId: event.tenantId,
        memberName: (event['memberName'] as string) ?? 'Member',
        memberEmail: (event['memberEmail'] as string) ?? '',
        amountPence: (event['amountPence'] as number) ?? 0,
        currency: (event['currency'] as string) ?? 'GBP',
        description: (event['description'] as string) ?? 'Payment',
        reference: event['reference'] as string | undefined,
      })
    }

    if (event.type === 'payment.refund_issued') {
      void this.accountingSync.onPaymentRefundIssued({
        paymentId: event['paymentId'] as string,
        refundId: (event['refundId'] as string) ?? (event['paymentId'] as string),
        tenantId: event.tenantId,
        memberName: (event['memberName'] as string) ?? 'Member',
        memberEmail: (event['memberEmail'] as string) ?? '',
        amountPence: (event['amountPence'] as number) ?? 0,
        currency: (event['currency'] as string) ?? 'GBP',
        description: (event['description'] as string) ?? 'Refund',
      })
    }

    if (event.type === 'membership.activated') {
      void this.accountingSync.onMembershipActivated({
        membershipId: event['membershipId'] as string,
        tenantId: event.tenantId,
        memberName: (event['memberName'] as string) ?? 'Member',
        memberEmail: (event['memberEmail'] as string) ?? '',
        amountPence: (event['amountPence'] as number) ?? 0,
        currency: (event['currency'] as string) ?? 'GBP',
        planName: (event['planName'] as string) ?? 'Membership',
      })
    }

    return { received: true }
  }
}
