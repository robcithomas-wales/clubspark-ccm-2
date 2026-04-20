import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ScoringRepository } from './scoring.repository.js'
import {
  computeChurnRisk,
  computeLtv,
  computeDefaultRisk,
  computeOptimalSendHour,
} from './scoring.algorithms.js'

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name)

  constructor(private readonly repo: ScoringRepository) {}

  // ── Nightly batch scoring — runs at 01:30 AM daily ────────────────────────

  @Cron('30 1 * * *')
  async batchScoreAllTenants(): Promise<void> {
    this.logger.log('Member scoring batch starting')
    const tenantIds = await this.repo.getActiveTenantIds()
    this.logger.log(`Scoring ${tenantIds.length} tenants`)

    let total = 0
    for (const tenantId of tenantIds) {
      try {
        const count = await this.scoreTenant(tenantId)
        total += count
      } catch (err) {
        this.logger.error(`Scoring failed for tenant ${tenantId}: ${(err as Error).message}`)
      }
    }

    this.logger.log(`Member scoring complete — ${total} records updated`)
  }

  async scoreTenant(tenantId: string): Promise<number> {
    const persons = await this.repo.fetchPersonData(tenantId)

    for (const person of persons) {
      const noShowRate =
        person.totalSessionsWithStatus90Days > 0
          ? person.noShowCount90Days / person.totalSessionsWithStatus90Days
          : 0

      const churn = computeChurnRisk({
        daysSinceLastBooking: person.daysSinceLastBooking,
        bookingsLast30Days: person.bookingsLast30Days,
        bookingsPrev30Days: person.bookingsPrev30Days,
        membershipStatus: person.membershipStatus,
        autoRenew: person.autoRenew,
        daysToRenewal: person.daysToRenewal,
        emailsReceived90Days: person.emailsReceived90Days,
        emailsOpened90Days: person.emailsOpened90Days,
      })

      const ltv = computeLtv({
        bookingRevenue12m: person.bookingRevenue12mPence,
        bookingCount12m: person.bookingCount12m,
        membershipAnnualValue: person.membershipAnnualValuePence,
        memberFirstBookingAt: person.memberFirstBookingAt,
        coachingRevenue12m: person.coachingRevenue12mPence,
      })

      const defaultRisk = computeDefaultRisk({
        failedPayments12m: person.failedPayments12m,
        successfulPayments12m: person.successfulPayments12m,
        membershipTenureMonths: person.membershipTenureMonths,
        hasActiveMembership: person.hasActiveMembership,
        recentSuccessfulPaymentDays: person.recentSuccessfulPaymentDays,
        noShowRate90Days: noShowRate,
      })

      const sendHour = computeOptimalSendHour(person.openedHours)

      await this.repo.upsertScore({
        tenantId,
        personId: person.personId,
        churnRisk: churn.score,
        churnBand: churn.band,
        churnFactors: churn.factors,
        ltvScore: ltv.score,
        ltvFactors: ltv.factors,
        defaultRisk: defaultRisk.score,
        defaultBand: defaultRisk.band,
        defaultFactors: defaultRisk.factors,
        optimalSendHour: sendHour.hour,
        sendHourConfidence: sendHour.confidence > 0 ? sendHour.confidence : null,
      })
    }

    return persons.length
  }

  // ── On-demand scoring for a single person ─────────────────────────────────

  async scoreOnePerson(tenantId: string, personId: string) {
    // Run full tenant batch and return the score for this person
    // (simpler than extracting per-person SQL — fast enough for <500 persons/tenant)
    await this.scoreTenant(tenantId)
    return this.repo.findByPersonId(tenantId, personId)
  }

  // ── Read API ──────────────────────────────────────────────────────────────

  async listScores(tenantId: string, page = 1, limit = 50, minChurnRisk?: number) {
    const { data, total } = await this.repo.findByTenant(tenantId, page, limit, minChurnRisk)
    return {
      data: data.map(formatScore),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async getScore(tenantId: string, personId: string) {
    const score = await this.repo.findByPersonId(tenantId, personId)
    return score ? formatScore(score) : null
  }

  async getScoresBulk(tenantId: string, personIds: string[]) {
    const scores = await this.repo.findByPersonIds(tenantId, personIds)
    const map = new Map(scores.map((s) => [s.personId, formatScore(s)]))
    return Object.fromEntries(map)
  }
}

function formatScore(s: {
  personId: string
  churnRisk: number
  churnBand: string
  churnFactors: unknown
  ltvScore: number
  ltvFactors: unknown
  defaultRisk: number
  defaultBand: string
  defaultFactors: unknown
  optimalSendHour: number | null
  sendHourConfidence: number | null
  computedAt: Date
}) {
  return {
    personId: s.personId,
    churnRisk: s.churnRisk,
    churnBand: s.churnBand,
    churnFactors: s.churnFactors,
    ltvScore: s.ltvScore,
    ltvScoreFormatted: `£${(s.ltvScore / 100).toFixed(2)}`,
    defaultRisk: s.defaultRisk,
    defaultBand: s.defaultBand,
    defaultFactors: s.defaultFactors,
    optimalSendHour: s.optimalSendHour,
    sendHourConfidence: s.sendHourConfidence,
    computedAt: s.computedAt.toISOString(),
  }
}
