import { describe, it, expect } from 'vitest'
import {
  computeChurnRisk,
  computeLtv,
  computeDefaultRisk,
  computeOptimalSendHour,
} from '../src/scoring/scoring.algorithms.js'

describe('computeChurnRisk', () => {
  it('returns high risk for member with no booking history', () => {
    const result = computeChurnRisk({
      daysSinceLastBooking: null,
      bookingsLast30Days: 0,
      bookingsPrev30Days: 0,
      membershipStatus: null,
      autoRenew: null,
      daysToRenewal: null,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(result.score).toBeGreaterThanOrEqual(55)
    expect(result.band).toBe('high')
  })

  it('returns low risk for active regular booker with auto-renew', () => {
    const result = computeChurnRisk({
      daysSinceLastBooking: 3,
      bookingsLast30Days: 8,
      bookingsPrev30Days: 6,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 180,
      emailsReceived90Days: 10,
      emailsOpened90Days: 5,
    })
    expect(result.score).toBeLessThan(35)
    expect(result.band).toBe('low')
  })

  it('increases risk for suspended membership', () => {
    const base = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 3,
      bookingsPrev30Days: 3,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    const suspended = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 3,
      bookingsPrev30Days: 3,
      membershipStatus: 'suspended',
      autoRenew: null,
      daysToRenewal: null,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(suspended.score).toBeGreaterThan(base.score)
  })

  it('penalises auto_renew=false', () => {
    const withAutoRenew = computeChurnRisk({
      daysSinceLastBooking: 5,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    const withoutAutoRenew = computeChurnRisk({
      daysSinceLastBooking: 5,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: false,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(withoutAutoRenew.score).toBeGreaterThan(withAutoRenew.score)
  })

  it('penalises renewal within 30 days', () => {
    const far = computeChurnRisk({
      daysSinceLastBooking: 5,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: false,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    const near = computeChurnRisk({
      daysSinceLastBooking: 5,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: false,
      daysToRenewal: 10,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(near.score).toBeGreaterThan(far.score)
  })

  it('rewards high email engagement', () => {
    const lowEngage = computeChurnRisk({
      daysSinceLastBooking: 20,
      bookingsLast30Days: 2,
      bookingsPrev30Days: 2,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 60,
      emailsReceived90Days: 10,
      emailsOpened90Days: 0,
    })
    const highEngage = computeChurnRisk({
      daysSinceLastBooking: 20,
      bookingsLast30Days: 2,
      bookingsPrev30Days: 2,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 60,
      emailsReceived90Days: 10,
      emailsOpened90Days: 5,
    })
    expect(highEngage.score).toBeLessThan(lowEngage.score)
  })

  it('score is always 0–100', () => {
    for (let i = 0; i < 20; i++) {
      const result = computeChurnRisk({
        daysSinceLastBooking: Math.random() > 0.3 ? Math.floor(Math.random() * 200) : null,
        bookingsLast30Days: Math.floor(Math.random() * 20),
        bookingsPrev30Days: Math.floor(Math.random() * 20),
        membershipStatus: Math.random() > 0.5 ? 'active' : null,
        autoRenew: Math.random() > 0.5,
        daysToRenewal: Math.random() > 0.5 ? Math.floor(Math.random() * 365) : null,
        emailsReceived90Days: Math.floor(Math.random() * 20),
        emailsOpened90Days: Math.floor(Math.random() * 10),
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('reduces risk for strong upward booking trend', () => {
    const flat = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    const trending = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 8,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(trending.score).toBeLessThan(flat.score)
    expect(trending.factors.bookingTrendUp).toBe(-12)
  })

  it('increases risk for sharp booking decline', () => {
    const stable = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 5,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    const declining = computeChurnRisk({
      daysSinceLastBooking: 10,
      bookingsLast30Days: 1,
      bookingsPrev30Days: 5,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(declining.score).toBeGreaterThan(stable.score)
    expect(declining.factors.bookingTrendDown).toBe(18)
  })

  it('flags recent inactivity for historically active member with no recent bookings', () => {
    const result = computeChurnRisk({
      daysSinceLastBooking: 20,
      bookingsLast30Days: 0,
      bookingsPrev30Days: 0,
      membershipStatus: 'active',
      autoRenew: true,
      daysToRenewal: 90,
      emailsReceived90Days: 0,
      emailsOpened90Days: 0,
    })
    expect(result.factors.recentInactivity).toBe(8)
  })
})

describe('computeLtv', () => {
  it('returns 0 for a member with no revenue', () => {
    const result = computeLtv({
      bookingRevenue12m: 0,
      bookingCount12m: 0,
      membershipAnnualValue: 0,
      memberFirstBookingAt: null,
      coachingRevenue12m: 0,
    })
    expect(result.score).toBe(0)
  })

  it('sums all revenue components', () => {
    const result = computeLtv({
      bookingRevenue12m: 5000,   // £50
      bookingCount12m: 10,
      membershipAnnualValue: 10000, // £100
      memberFirstBookingAt: null,
      coachingRevenue12m: 2000,  // £20
    })
    // Total raw = 17000, multiplier = 0.7 (new member) = 11900
    expect(result.score).toBeGreaterThan(0)
    expect(result.factors.bookingRevenue).toBe(5000)
    expect(result.factors.membershipValue).toBe(10000)
  })

  it('applies higher multiplier for long-tenure members', () => {
    const newMember = computeLtv({
      bookingRevenue12m: 10000,
      bookingCount12m: 10,
      membershipAnnualValue: 5000,
      memberFirstBookingAt: null,
      coachingRevenue12m: 0,
    })
    const twoYearMember = computeLtv({
      bookingRevenue12m: 10000,
      bookingCount12m: 10,
      membershipAnnualValue: 5000,
      memberFirstBookingAt: new Date(Date.now() - 2.5 * 365 * 86400 * 1000),
      coachingRevenue12m: 0,
    })
    expect(twoYearMember.score).toBeGreaterThan(newMember.score)
  })
})

describe('computeDefaultRisk', () => {
  it('returns low risk for perfect payment history', () => {
    const result = computeDefaultRisk({
      failedPayments12m: 0,
      successfulPayments12m: 12,
      membershipTenureMonths: 24,
      hasActiveMembership: true,
      recentSuccessfulPaymentDays: 15,
      noShowRate90Days: 0,
    })
    expect(result.score).toBeLessThan(25)
    expect(result.band).toBe('low')
  })

  it('returns high risk for repeated failures', () => {
    const result = computeDefaultRisk({
      failedPayments12m: 3,
      successfulPayments12m: 1,
      membershipTenureMonths: 1,
      hasActiveMembership: false,
      recentSuccessfulPaymentDays: null,
      noShowRate90Days: 0.3,
    })
    expect(result.score).toBeGreaterThanOrEqual(55)
    expect(result.band).toBe('high')
  })

  it('new member without payment history has elevated risk', () => {
    const result = computeDefaultRisk({
      failedPayments12m: 0,
      successfulPayments12m: 0,
      membershipTenureMonths: null,
      hasActiveMembership: false,
      recentSuccessfulPaymentDays: null,
      noShowRate90Days: 0,
    })
    expect(result.score).toBeGreaterThan(0)
  })

  it('score is always 0–100', () => {
    for (let i = 0; i < 20; i++) {
      const result = computeDefaultRisk({
        failedPayments12m: Math.floor(Math.random() * 5),
        successfulPayments12m: Math.floor(Math.random() * 20),
        membershipTenureMonths: Math.random() > 0.3 ? Math.floor(Math.random() * 48) : null,
        hasActiveMembership: Math.random() > 0.5,
        recentSuccessfulPaymentDays: Math.random() > 0.4 ? Math.floor(Math.random() * 60) : null,
        noShowRate90Days: Math.random(),
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })
})

describe('computeOptimalSendHour', () => {
  it('returns null with insufficient data', () => {
    const result = computeOptimalSendHour([10, 10])
    expect(result.hour).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('returns the most common hour', () => {
    const result = computeOptimalSendHour([9, 9, 9, 10, 14, 9])
    expect(result.hour).toBe(9)
    expect(result.confidence).toBeCloseTo(4 / 6, 2)
  })

  it('handles evenly distributed hours', () => {
    const hours = [8, 9, 10, 11, 12]
    const result = computeOptimalSendHour(hours)
    expect(result.hour).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0)
  })
})
