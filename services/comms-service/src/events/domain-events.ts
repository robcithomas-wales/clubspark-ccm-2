/**
 * Domain Event Contracts
 * ─────────────────────
 * These interfaces define the shape of every event published to the event bus.
 * Publishers (booking-service, membership-service, payment-service, etc.) must
 * conform to these contracts when calling EventBusService.publish().
 *
 * In production (Azure):
 *   - Each service publishes to its own Azure Service Bus Topic.
 *   - comms-service subscribes to each topic via a named subscription ("comms").
 *   - Adding a new subscriber (e.g. analytics-service) is a new subscription — zero
 *     code change to publishers.
 *
 * Topic → Event type mapping:
 *   booking-events   → BookingConfirmedEvent | BookingCancelledEvent | BookingReminderDueEvent
 *   membership-events→ MembershipActivatedEvent | MembershipRenewalDueEvent | MembershipExpiredEvent
 *   payment-events   → PaymentSucceededEvent | PaymentFailedEvent | PaymentRefundIssuedEvent
 *   team-events      → FixtureReminderDueEvent
 */

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

export interface BaseDomainEvent {
  type: DomainEventType
  tenantId: string
  occurredAt: string  // ISO 8601
}

// ─── Booking Events ───────────────────────────────────────────────────────────

export interface BookingConfirmedEvent extends BaseDomainEvent {
  type: 'booking.confirmed'
  bookingId: string
  bookingReference: string
  bookerPersonId: string
  bookerEmail: string
  bookerFirstName: string
  venueId: string
  venueName: string
  resourceName: string
  bookableUnitName: string
  startsAt: string   // ISO 8601
  endsAt: string     // ISO 8601
  price?: number
  currency?: string
}

export interface BookingCancelledEvent extends BaseDomainEvent {
  type: 'booking.cancelled'
  bookingId: string
  bookingReference: string
  bookerPersonId: string
  bookerEmail: string
  bookerFirstName: string
  venueName: string
  resourceName: string
  startsAt: string
}

export interface BookingReminderDueEvent extends BaseDomainEvent {
  type: 'booking.reminder_due'
  bookingId: string
  bookingReference: string
  bookerPersonId: string
  bookerEmail: string
  bookerFirstName: string
  venueName: string
  resourceName: string
  bookableUnitName: string
  startsAt: string
  endsAt: string
  hoursUntil: number  // 24 | 1
}

// ─── Membership Events ────────────────────────────────────────────────────────

export interface MembershipActivatedEvent extends BaseDomainEvent {
  type: 'membership.activated'
  membershipId: string
  personId: string
  personEmail: string
  personFirstName: string
  planName: string
  startsAt: string
  expiresAt?: string
}

export interface MembershipRenewalDueEvent extends BaseDomainEvent {
  type: 'membership.renewal_due'
  membershipId: string
  personId: string
  personEmail: string
  personFirstName: string
  planName: string
  expiresAt: string
  renewalUrl?: string
}

export interface MembershipExpiredEvent extends BaseDomainEvent {
  type: 'membership.expired'
  membershipId: string
  personId: string
  personEmail: string
  personFirstName: string
  planName: string
  expiredAt: string
}

// ─── Payment Events ───────────────────────────────────────────────────────────

export interface PaymentSucceededEvent extends BaseDomainEvent {
  type: 'payment.succeeded'
  paymentId: string
  personId: string
  personEmail: string
  personFirstName: string
  amount: number
  currency: string
  description: string
  receiptUrl?: string
}

export interface PaymentFailedEvent extends BaseDomainEvent {
  type: 'payment.failed'
  paymentId: string
  personId: string
  personEmail: string
  personFirstName: string
  amount: number
  currency: string
  description: string
  failureReason?: string
}

export interface PaymentRefundIssuedEvent extends BaseDomainEvent {
  type: 'payment.refund_issued'
  paymentId: string
  personId: string
  personEmail: string
  personFirstName: string
  amount: number
  currency: string
  description: string
}

// ─── Team Events ──────────────────────────────────────────────────────────────

export interface FixtureReminderDueEvent extends BaseDomainEvent {
  type: 'fixture.reminder_due'
  fixtureId: string
  teamId: string
  teamName: string
  opponentName: string
  kickoffAt: string
  location: string
  personId: string
  personEmail: string
  personFirstName: string
  hoursUntil: number
}

export type DomainEvent =
  | BookingConfirmedEvent
  | BookingCancelledEvent
  | BookingReminderDueEvent
  | MembershipActivatedEvent
  | MembershipRenewalDueEvent
  | MembershipExpiredEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRefundIssuedEvent
  | FixtureReminderDueEvent
