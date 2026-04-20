// Pure scoring functions — no side effects, fully testable

export interface ChurnInput {
  daysSinceLastBooking: number | null   // null = no bookings ever
  bookingsLast30Days: number
  bookingsPrev30Days: number
  membershipStatus: string | null       // null = no membership
  autoRenew: boolean | null
  daysToRenewal: number | null          // null = no active membership
  emailsReceived90Days: number
  emailsOpened90Days: number
}

export interface ChurnResult {
  score: number                         // 0–100 (higher = more at risk)
  band: 'low' | 'medium' | 'high'
  factors: Record<string, number>
}

export function computeChurnRisk(input: ChurnInput): ChurnResult {
  let score = 0
  const factors: Record<string, number> = {}

  // Days since last booking (0–55 pts)
  if (input.daysSinceLastBooking === null) {
    factors.noBookingHistory = 55
    score += 55
  } else if (input.daysSinceLastBooking > 90) {
    factors.lastBookingAge = 45
    score += 45
  } else if (input.daysSinceLastBooking > 60) {
    factors.lastBookingAge = 30
    score += 30
  } else if (input.daysSinceLastBooking > 30) {
    factors.lastBookingAge = 15
    score += 15
  } else if (input.daysSinceLastBooking > 14) {
    factors.lastBookingAge = 5
    score += 5
  }

  // Booking frequency trend (–12 to +18 pts)
  if (input.bookingsPrev30Days > 0) {
    const trend = (input.bookingsLast30Days - input.bookingsPrev30Days) / input.bookingsPrev30Days
    if (trend > 0.2) {
      factors.bookingTrendUp = -12
      score -= 12
    } else if (trend < -0.5) {
      factors.bookingTrendDown = 18
      score += 18
    } else if (trend < -0.2) {
      factors.bookingTrendDown = 10
      score += 10
    }
  } else if (input.bookingsLast30Days === 0 && input.daysSinceLastBooking !== null && input.daysSinceLastBooking > 14) {
    // Was active historically but nothing recent
    factors.recentInactivity = 8
    score += 8
  }

  // Membership status (0–20 pts)
  if (input.membershipStatus === null) {
    factors.noMembership = 8
    score += 8
  } else if (input.membershipStatus === 'active') {
    if (input.autoRenew === false) {
      factors.autoRenewOff = 12
      score += 12
    }
    if (input.daysToRenewal !== null && input.daysToRenewal >= 0 && input.daysToRenewal < 30) {
      factors.renewalImminent = 15
      score += 15
    }
  } else if (input.membershipStatus === 'suspended') {
    factors.suspendedMembership = 20
    score += 20
  }

  // Email engagement over last 90 days (–5 to +10 pts)
  if (input.emailsReceived90Days >= 5) {
    const openRate = input.emailsOpened90Days / input.emailsReceived90Days
    if (openRate < 0.1) {
      factors.lowEmailEngagement = 10
      score += 10
    } else if (openRate > 0.3) {
      factors.highEmailEngagement = -5
      score -= 5
    }
  }

  const finalScore = Math.max(0, Math.min(100, score))
  return {
    score: finalScore,
    band: finalScore >= 60 ? 'high' : finalScore >= 30 ? 'medium' : 'low',
    factors,
  }
}

// ─── LTV ─────────────────────────────────────────────────────────────────────

export interface LtvInput {
  bookingRevenue12m: number    // pence
  bookingCount12m: number
  membershipAnnualValue: number // pence
  memberFirstBookingAt: Date | null
  coachingRevenue12m: number   // pence
}

export interface LtvResult {
  score: number               // pence per year (estimated)
  factors: Record<string, number>
}

export function computeLtv(input: LtvInput): LtvResult {
  const factors: Record<string, number> = {}

  // Raw annual revenue components (already annualised from last 12 months)
  factors.bookingRevenue = input.bookingRevenue12m
  factors.membershipValue = input.membershipAnnualValue
  factors.coachingRevenue = input.coachingRevenue12m

  const rawAnnual = input.bookingRevenue12m + input.membershipAnnualValue + input.coachingRevenue12m

  // Retention multiplier based on member tenure
  let retentionMultiplier = 1.0
  if (input.memberFirstBookingAt) {
    const tenureMonths = (Date.now() - input.memberFirstBookingAt.getTime()) / (30 * 24 * 3600 * 1000)
    if (tenureMonths >= 24) retentionMultiplier = 1.5
    else if (tenureMonths >= 12) retentionMultiplier = 1.2
    else if (tenureMonths >= 6) retentionMultiplier = 1.0
    else retentionMultiplier = 0.8
  } else {
    retentionMultiplier = 0.7 // New/no-booking member
  }

  factors.retentionMultiplier = retentionMultiplier

  return {
    score: Math.round(rawAnnual * retentionMultiplier),
    factors,
  }
}

// ─── Payment Default Risk ─────────────────────────────────────────────────────

export interface DefaultRiskInput {
  failedPayments12m: number
  successfulPayments12m: number
  membershipTenureMonths: number | null   // null = no membership history
  hasActiveMembership: boolean
  recentSuccessfulPaymentDays: number | null // null = no recent success
  noShowRate90Days: number                 // 0–1
}

export interface DefaultRiskResult {
  score: number               // 0–100
  band: 'low' | 'medium' | 'high'
  factors: Record<string, number>
}

export function computeDefaultRisk(input: DefaultRiskInput): DefaultRiskResult {
  let score = 0
  const factors: Record<string, number> = {}

  // Failed payment history (0–50 pts)
  if (input.failedPayments12m >= 3) {
    factors.failedPayments = 50
    score += 50
  } else if (input.failedPayments12m === 2) {
    factors.failedPayments = 35
    score += 35
  } else if (input.failedPayments12m === 1) {
    factors.failedPayments = 20
    score += 20
  }

  // No-show rate as friction/disengagement proxy (0–20 pts)
  if (input.noShowRate90Days > 0.25) {
    factors.highNoShowRate = 20
    score += 20
  } else if (input.noShowRate90Days > 0.1) {
    factors.elevatedNoShowRate = 10
    score += 10
  }

  // New member risk (0–15 pts)
  if (input.membershipTenureMonths === null || input.membershipTenureMonths < 3) {
    factors.newMember = 15
    score += 15
  } else if (input.membershipTenureMonths >= 12) {
    factors.establishedMember = -10
    score -= 10
  }

  // Has active membership (–8 pts commitment signal)
  if (input.hasActiveMembership) {
    factors.hasMembership = -8
    score -= 8
  }

  // Recent successful payment (–15 pts)
  if (input.recentSuccessfulPaymentDays !== null && input.recentSuccessfulPaymentDays <= 30) {
    factors.recentSuccessfulPayment = -15
    score -= 15
  }

  const finalScore = Math.max(0, Math.min(100, score))
  return {
    score: finalScore,
    band: finalScore >= 55 ? 'high' : finalScore >= 25 ? 'medium' : 'low',
    factors,
  }
}

// ─── Optimal Send Hour ────────────────────────────────────────────────────────

export function computeOptimalSendHour(openedHours: number[]): { hour: number | null; confidence: number } {
  if (openedHours.length < 3) return { hour: null, confidence: 0 }

  const histogram = new Array<number>(24).fill(0)
  for (const h of openedHours) {
    histogram[h] = (histogram[h] ?? 0) + 1
  }

  let maxCount = 0
  let bestHour = 10 // default fallback
  for (let h = 0; h < 24; h++) {
    if ((histogram[h] ?? 0) > maxCount) {
      maxCount = histogram[h] ?? 0
      bestHour = h
    }
  }

  const confidence = maxCount / openedHours.length
  return { hour: bestHour, confidence }
}
