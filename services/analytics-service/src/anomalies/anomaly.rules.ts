// Pure anomaly rule definitions and severity constants

export type AnomalySeverity = 'warning' | 'alert'

export interface AnomalyRuleResult {
  ruleId: string
  severity: AnomalySeverity
  description: string
  personId?: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
}

export const ANOMALY_RULES = {
  DORMANT_SPIKE: 'dormant_spike',
  PAYMENT_FAILURE_SPIKE: 'payment_failure_spike',
  COURT_HOARDING: 'court_hoarding',
  BOOKING_DURATION_EXTREME: 'booking_duration_extreme',
} as const

export type AnomalyRuleId = typeof ANOMALY_RULES[keyof typeof ANOMALY_RULES]

// Rule descriptions used in detection results
export function describeRule(ruleId: AnomalyRuleId, metadata: Record<string, unknown>): string {
  switch (ruleId) {
    case ANOMALY_RULES.DORMANT_SPIKE:
      return `Account dormant for ${metadata.dormantDays} days made ${metadata.bookingCount} bookings in 24 hours`
    case ANOMALY_RULES.PAYMENT_FAILURE_SPIKE:
      return `${metadata.failureCount} payment failures in 24 hours`
    case ANOMALY_RULES.COURT_HOARDING:
      return `Same unit booked ${metadata.bookingCount} times in 7 days`
    case ANOMALY_RULES.BOOKING_DURATION_EXTREME:
      return `Booking duration of ${metadata.durationHours} hours (threshold: 6h)`
    default:
      return 'Anomaly detected'
  }
}
