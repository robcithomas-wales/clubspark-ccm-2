import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'

export type DomainEventType = 'booking.confirmed' | 'booking.cancelled' | 'booking.reminder_due'

export interface DomainEvent {
  type: DomainEventType
  tenantId: string
  occurredAt: string
  [key: string]: unknown
}

/**
 * Event Bus Service — booking-service
 * ─────────────────────────────────────────────────────────────────────────────
 * Publishes domain events to subscribers (comms-service, analytics, etc.).
 *
 * PILOT mode: events are sent via HTTP POST to the comms-service inbound
 * endpoint. The full comms pipeline (send rules, templates, delivery stub,
 * message log) runs on every event — only actual email dispatch is stubbed.
 *
 * PRODUCTION (Azure Service Bus):
 * ─────────────────────────────────
 *   1. npm install @azure/service-bus
 *   2. Set AZURE_SERVICE_BUS_CONNECTION_STRING in .env
 *   3. Create topic 'booking-events' in Azure Service Bus namespace
 *   4. Create subscription 'comms' on that topic (comms-service subscribes)
 *   5. Replace the HTTP call in publish() with:
 *
 *   import { ServiceBusClient } from '@azure/service-bus'
 *
 *   private sender: ReturnType<ServiceBusClient['createSender']> | null = null
 *
 *   private getSender() {
 *     if (!this.sender) {
 *       const client = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING)
 *       this.sender = client.createSender('booking-events')
 *     }
 *     return this.sender
 *   }
 *
 *   async publish(event: DomainEvent): Promise<void> {
 *     await this.getSender().sendMessages({
 *       body: event,
 *       contentType: 'application/json',
 *       subject: event.type,
 *     })
 *   }
 *
 *   async onModuleDestroy() {
 *     await this.sender?.close()
 *   }
 *
 * Benefits of Azure Service Bus over direct HTTP:
 *   - Decoupled: booking-service doesn't need to know comms-service address
 *   - Durable: events survive comms-service restarts (dead-letter queue)
 *   - Fanout: add analytics-service subscription without changing publishers
 *   - Ordered delivery: FIFO sessions if needed
 *   - Built-in retry with exponential backoff
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name)
  private readonly subscribers: string[]

  constructor(config: ConfigService<AppConfig, true>) {
    // PILOT: broadcast to all inbound-event endpoints.
    // PRODUCTION: replace with Azure Service Bus (see JSDoc above).
    this.subscribers = [
      `${config.get('commsService', { infer: true }).url}/v1/events/inbound`,
      `${config.get('peopleService', { infer: true }).url}/events/inbound`,
      `${config.get('integrationService', { infer: true }).url}/v1/events/inbound`,
    ]
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const url of this.subscribers) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(event),
        })
        if (!res.ok) {
          this.logger.warn(`EventBus publish failed → ${url} (${res.status}): ${event.type}`)
        } else {
          this.logger.debug(`[EventBus] Published ${event.type} → ${url}`)
        }
      } catch (err) {
        // Never throw — event bus failures must not break the originating operation
        this.logger.error(`[EventBus] Could not publish ${event.type} → ${url}: ${String(err)}`)
      }
    }
  }

  /**
   * Every inbound-event endpoint is behind an InternalSecretGuard, so the secret
   * is required — without it comms/people/integration reject the event and the
   * failure is swallowed below. This was silently dropping every domain event
   * anywhere the guard is enforced (i.e. production).
   */
  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    const secret = process.env['INTERNAL_SECRET']
    if (secret) h['x-internal-secret'] = secret
    return h
  }
}
