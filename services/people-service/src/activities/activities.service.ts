import { Injectable, Logger } from '@nestjs/common'
import { ActivitiesRepository } from './activities.repository.js'

interface InboundEvent {
  type: string
  tenantId: string
  occurredAt: string
  bookingId?: string
  bookingReference?: string
  customerId?: string
  membershipId?: string
  planName?: string
  amount?: number
  currency?: string
  [key: string]: unknown
}

function titleForEvent(event: InboundEvent): string | null {
  switch (event.type) {
    case 'booking.confirmed':
      return `Booking confirmed${event.bookingReference ? ` — ${event.bookingReference}` : ''}`
    case 'booking.cancelled':
      return `Booking cancelled${event.bookingReference ? ` — ${event.bookingReference}` : ''}`
    case 'booking.reminder_due':
      return `Booking reminder sent${event.bookingReference ? ` — ${event.bookingReference}` : ''}`
    case 'membership.activated':
      return `Membership activated${event.planName ? ` — ${event.planName}` : ''}`
    case 'membership.cancelled':
      return `Membership cancelled${event.planName ? ` — ${event.planName}` : ''}`
    case 'payment.succeeded':
      return `Payment received${event.amount != null ? ` — £${Number(event.amount).toFixed(2)}` : ''}`
    default:
      return null
  }
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name)

  constructor(private readonly repo: ActivitiesRepository) {}

  async handleInboundEvent(event: InboundEvent): Promise<void> {
    const title = titleForEvent(event)
    if (!title) {
      this.logger.debug(`No activity mapping for event type: ${event.type}`)
      return
    }

    // Events include customerId — this maps directly to person id (same UUID)
    const personId = event.customerId
    if (!personId) {
      this.logger.debug(`Event ${event.type} has no customerId — skipping`)
      return
    }

    // Verify person exists in our tenant
    const knownId = await this.repo.findPersonIdByCustomerId(event.tenantId, personId)
    if (!knownId) {
      this.logger.debug(`Person ${personId} not found in tenant ${event.tenantId}`)
      return
    }

    const occurredAt = new Date(event.occurredAt)
    const { type, tenantId, occurredAt: _occ, customerId: _cid, ...rest } = event

    await this.repo.record({
      tenantId: event.tenantId,
      personId,
      eventType: event.type,
      title,
      meta: rest as Record<string, unknown>,
      sourceId: event.bookingId ?? event.membershipId,
      occurredAt,
    })

    await this.repo.touchLastActivity(event.tenantId, personId, occurredAt)
  }

  async listForPerson(tenantId: string, personId: string, limit?: number) {
    return this.repo.listForPerson(tenantId, personId, limit)
  }
}
