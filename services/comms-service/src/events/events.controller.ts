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
import { NotificationsService } from '../notifications/notifications.service.js'
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

  constructor(
    private readonly notifications: NotificationsService,
    private readonly inbox: EventInboxService,
  ) {}

  /**
   * Receives a domain event from any publisher service.
   * Tenant auth is skipped (internal service-to-service call); the endpoint is
   * protected by the shared internal secret via InternalSecretGuard (fail-closed
   * in production). tenantId is read from the event body — inherent to internal
   * event delivery; the secret is the guard. In production this is replaced by
   * the Azure Service Bus subscription listener.
   */
  @Post('inbound')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @ApiSecurity('internal-secret')
  @ApiOperation({ summary: 'Inbound domain event (pilot: HTTP; production: Azure Service Bus)' })
  async inbound(@Body() event: DomainEvent): Promise<{ received: boolean }> {
    this.logger.log(`[EventBus INBOUND] ${event.type} — tenant ${event.tenantId}`)
    const outcome = await this.inbox.process(event, () => this.notifications.handle(event))
    ackOrRetry(outcome, event.type)
    return { received: true }
  }
}
