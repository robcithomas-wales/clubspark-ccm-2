import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { GatewayFactory } from '../gateways/gateway.factory.js'
import { ProviderConfigsRepository } from '../provider-configs/provider-configs.repository.js'
import { PaymentsRepository } from '../payments/payments.repository.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { OutboxRepository } from '../outbox/outbox.repository.js'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly prisma: PrismaService,
    private readonly providerConfigsRepo: ProviderConfigsRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly gatewayFactory: GatewayFactory,
    private readonly eventBus: EventBusService,
  ) {}

  async handleStripe(tenantId: string, rawBody: Buffer, signature: string): Promise<void> {
    await this.handle('stripe', tenantId, rawBody, signature)
  }

  async handleGoCardless(tenantId: string, rawBody: Buffer, signature: string): Promise<void> {
    await this.handle('gocardless', tenantId, rawBody, signature)
  }

  private async handle(
    provider: string,
    tenantId: string,
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    const providerConfig = await this.providerConfigsRepo.findByProvider(tenantId, provider)
    if (!providerConfig) {
      throw new NotFoundException(`No ${provider} provider config found for tenant ${tenantId}`)
    }

    const gateway = this.gatewayFactory.create(
      provider,
      providerConfig.credentials as Record<string, string>,
    )

    // Construct and verify the event — throws if signature is invalid
    const event = gateway.constructWebhookEvent(rawBody, signature)

    // Persist raw event immediately before any processing
    // Duplicate gateway event IDs are silently ignored (idempotent replay)
    const existing = event.gatewayEventId
      ? await this.prisma.read.webhookEvent.findUnique({
          where: { gatewayEventId: event.gatewayEventId },
        })
      : null

    if (existing) {
      this.logger.log(`Duplicate webhook event ${event.gatewayEventId} — skipping`)
      return
    }

    const webhookRecord = await this.prisma.write.webhookEvent.create({
      data: {
        providerConfigId: providerConfig.id,
        provider,
        gatewayEventId: event.gatewayEventId,
        eventType: event.type,
        payload: event.rawEvent as object,
      },
    })

    try {
      await this.processEvent(event.type, event.gatewayRef)

      await this.prisma.write.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { processedAt: new Date() },
      })
    } catch (err) {
      await this.prisma.write.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { error: err instanceof Error ? err.message : String(err) },
      })
      // Don't rethrow — return 200 to the gateway to prevent retries for
      // processing errors. Retries should be triggered manually from the log.
      this.logger.error(`Failed to process webhook event ${webhookRecord.id}`, err)
    }
  }

  private async processEvent(
    type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'unknown',
    gatewayRef: string,
  ): Promise<void> {
    if (type === 'unknown') {
      this.logger.log(`Ignoring unknown event type for gateway ref ${gatewayRef}`)
      return
    }

    const payment = await this.paymentsRepo.findByGatewayRef(gatewayRef)
    if (!payment) {
      this.logger.warn(`No payment found for gateway ref ${gatewayRef}`)
      return
    }

    switch (type) {
      case 'payment.succeeded':
        await this.paymentsRepo.updateStatus(
          payment.id,
          'succeeded',
          undefined,
          async (tx, updated) => {
            await this.outbox.enqueue(tx, {
              type: 'payment.succeeded',
              tenantId: updated.tenantId,
              occurredAt: new Date().toISOString(),
              paymentId: updated.id,
              personId: updated.customerId ?? '',
              personEmail: '', // TODO: hydrate from people-service (MR-1's PeopleClient)
              personFirstName: '',
              amount: Number(updated.amount ?? 0),
              currency: updated.currency ?? 'GBP',
              description: 'Payment',
            } as never)
          },
        )
        this.logger.log(`Payment ${payment.id} succeeded`)
        // TODO: populate personEmail + personFirstName from people-service lookup
        // payment.succeeded is recorded in the outbox inside updateStatus's transaction.
        break

      case 'payment.failed':
        await this.paymentsRepo.updateStatus(
          payment.id,
          'failed',
          undefined,
          async (tx, updated) => {
            await this.outbox.enqueue(tx, {
              type: 'payment.failed',
              tenantId: updated.tenantId,
              occurredAt: new Date().toISOString(),
              paymentId: updated.id,
              personId: updated.customerId ?? '',
              personEmail: '', // TODO: hydrate from people-service (MR-1's PeopleClient)
              personFirstName: '',
              amount: Number(updated.amount ?? 0),
              currency: updated.currency ?? 'GBP',
              description: 'Payment',
            } as never)
          },
        )
        this.logger.log(`Payment ${payment.id} failed`)
        // payment.failed is recorded in the outbox inside updateStatus's transaction.
        break

      case 'payment.refunded':
        this.logger.log(`Refund confirmed for payment ${payment.id}`)
        // Unlike succeeded/failed, this branch changes no payment state — the
        // refund is recorded by the gateway, not here — so there is no
        // transaction to be atomic with. The event still goes through the outbox
        // so it is durable and retried rather than fire-and-forget; it just
        // cannot carry the "commits with the state change" guarantee the other
        // two do. Worth revisiting if refunds ever update the payment row.
        await this.prisma.write.$transaction(async (tx) => {
          await this.outbox.enqueue(tx, {
            type: 'payment.refund_issued',
            tenantId: payment.tenantId,
            occurredAt: new Date().toISOString(),
            paymentId: payment.id,
            personId: payment.customerId ?? '',
            personEmail: '', // TODO: hydrate from people-service (MR-1's PeopleClient)
            personFirstName: '',
            amount: Number(payment.amount ?? 0),
            currency: payment.currency ?? 'GBP',
            description: 'Refund',
          } as never)
        })
        break
    }
  }
}
