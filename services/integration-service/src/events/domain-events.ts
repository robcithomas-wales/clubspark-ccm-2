export type DomainEventType =
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.reminder_due'
  | 'membership.activated'
  | 'membership.renewal_due'
  | 'membership.expired'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refund_issued'
  | 'fixture.reminder_due'

export interface DomainEvent {
  eventId?: string
  correlationId?: string
  schemaVersion?: number
  producer?: string
  type: DomainEventType
  tenantId: string
  occurredAt: string
  [key: string]: unknown
}
