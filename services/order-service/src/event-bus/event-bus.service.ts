import { Injectable, Logger } from '@nestjs/common'

export type OrderEventType =
  | 'order.created'
  | 'order.confirmed'
  | 'order.cancelled'
  | 'order.refunded'

export interface DomainEvent {
  type: OrderEventType
  tenantId: string
  occurredAt: string
  [key: string]: unknown
}

/**
 * Event Bus Service — order-service
 * ─────────────────────────────────────────────────────────────────────────────
 * PILOT: HTTP POST to subscribers.
 * PRODUCTION: Azure Service Bus topic 'order-events'
 *
 * Subscribers: comms-service (confirmations), integration-service (accounting sync)
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name)
  private readonly subscribers: string[]

  constructor() {
    const commsUrl = process.env['COMMS_SERVICE_URL'] ?? 'http://localhost:4012'
    const integrationUrl = process.env['INTEGRATION_SERVICE_URL'] ?? 'http://localhost:4013'
    this.subscribers = [
      `${commsUrl}/v1/events/inbound`,
      `${integrationUrl}/v1/events/inbound`,
    ]
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const url of this.subscribers) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })
        if (!res.ok) {
          this.logger.warn(`EventBus publish failed → ${url} (${res.status}): ${event.type}`)
        } else {
          this.logger.debug(`[EventBus] Published ${event.type} → ${url}`)
        }
      } catch (err) {
        this.logger.error(`[EventBus] Could not publish ${event.type} → ${url}: ${String(err)}`)
      }
    }
  }
}
