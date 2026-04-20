import { describe, it, expect } from 'vitest'
import { describeRule, ANOMALY_RULES } from '../src/anomalies/anomaly.rules.js'

describe('ANOMALY_RULES constants', () => {
  it('defines all four rule IDs', () => {
    expect(ANOMALY_RULES.DORMANT_SPIKE).toBe('dormant_spike')
    expect(ANOMALY_RULES.PAYMENT_FAILURE_SPIKE).toBe('payment_failure_spike')
    expect(ANOMALY_RULES.COURT_HOARDING).toBe('court_hoarding')
    expect(ANOMALY_RULES.BOOKING_DURATION_EXTREME).toBe('booking_duration_extreme')
  })
})

describe('describeRule', () => {
  it('describes dormant_spike with dormantDays and bookingCount', () => {
    const desc = describeRule(ANOMALY_RULES.DORMANT_SPIKE, { dormantDays: 90, bookingCount: 7 })
    expect(desc).toContain('90')
    expect(desc).toContain('7')
    expect(desc.toLowerCase()).toContain('dormant')
  })

  it('describes payment_failure_spike with failureCount', () => {
    const desc = describeRule(ANOMALY_RULES.PAYMENT_FAILURE_SPIKE, { failureCount: 5 })
    expect(desc).toContain('5')
    expect(desc.toLowerCase()).toContain('payment')
  })

  it('describes court_hoarding with bookingCount', () => {
    const desc = describeRule(ANOMALY_RULES.COURT_HOARDING, { bookingCount: 9 })
    expect(desc).toContain('9')
    expect(desc.toLowerCase()).toContain('unit')
  })

  it('describes booking_duration_extreme with durationHours', () => {
    const desc = describeRule(ANOMALY_RULES.BOOKING_DURATION_EXTREME, { durationHours: 8 })
    expect(desc).toContain('8')
    expect(desc.toLowerCase()).toContain('hour')
  })

  it('returns fallback string for unknown ruleId', () => {
    const desc = describeRule('unknown_rule' as any, {})
    expect(typeof desc).toBe('string')
    expect(desc.length).toBeGreaterThan(0)
  })
})
