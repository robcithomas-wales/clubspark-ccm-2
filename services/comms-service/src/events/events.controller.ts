import { Controller, Post, Body, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SkipTenant } from '../common/guards/tenant-context.guard.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import type { DomainEvent } from './domain-events.js'

/**
 * Inbound event endpoint — PILOT mode only.
 *
 * In PILOT: publisher services call POST /v1/events/inbound via HTTP.
 *   This is a direct call that keeps the full pipeline intact (send rules,
 *   template rendering, delivery stub, message log) without needing Azure.
 *
 * In PRODUCTION (Azure Service Bus):
 *   1. Remove this controller (or keep it for manual testing).
 *   2. In AppModule, register an Azure Service Bus listener for each topic:
 *      - booking-events   (subscription: comms)
 *      - membership-events (subscription: comms)
 *      - payment-events   (subscription: comms)
 *      - team-events      (subscription: comms)
 *   3. Each listener calls notificationsService.handle(event) — same method.
 *
 *   Azure Service Bus listener example:
 *   ─────────────────────────────────────
 *   import { ServiceBusClient } from '@azure/service-bus'
 *
 *   const client = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING)
 *   const receiver = client.createReceiver('booking-events', 'comms')
 *   receiver.subscribe({
 *     processMessage: async (msg) => {
 *       await notificationsService.handle(msg.body as DomainEvent)
 *     },
 *     processError: async (err) => logger.error(err),
 *   })
 *   ─────────────────────────────────────
 *   Register one receiver per topic in a dedicated EventBusListenerService
 *   that implements OnModuleInit / OnModuleDestroy.
 */
@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  private readonly logger = new Logger(EventsController.name)

  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Receives a domain event from any publisher service.
   * Authentication is skipped — this endpoint is internal-network only.
   * In production this is replaced by the Azure Service Bus subscription listener.
   */
  @Post('inbound')
  @SkipTenant()
  @ApiOperation({ summary: 'Inbound domain event (pilot: HTTP; production: Azure Service Bus)' })
  async inbound(@Body() event: DomainEvent): Promise<{ received: boolean }> {
    this.logger.log(`[EventBus INBOUND] ${event.type} — tenant ${event.tenantId}`)
    await this.notifications.handle(event)
    return { received: true }
  }
}
