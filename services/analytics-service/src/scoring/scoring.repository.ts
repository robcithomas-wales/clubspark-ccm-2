import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

// ─── Cross-schema aggregation result types ────────────────────────────────────

export interface PersonRawData {
  personId: string
  tenantId: string
  // Churn
  daysSinceLastBooking: number | null
  bookingsLast30Days: number
  bookingsPrev30Days: number
  membershipStatus: string | null
  autoRenew: boolean | null
  daysToRenewal: number | null
  emailsReceived90Days: number
  emailsOpened90Days: number
  // LTV
  bookingRevenue12mPence: number
  bookingCount12m: number
  membershipAnnualValuePence: number
  memberFirstBookingAt: Date | null
  coachingRevenue12mPence: number
  // Default risk
  failedPayments12m: number
  successfulPayments12m: number
  membershipTenureMonths: number | null
  hasActiveMembership: boolean
  recentSuccessfulPaymentDays: number | null
  noShowCount90Days: number
  totalSessionsWithStatus90Days: number
  // Send hour
  openedHours: number[]
}

@Injectable()
export class ScoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchPersonData(tenantId: string): Promise<PersonRawData[]> {
    // Single large cross-schema query — all aggregates per person in one pass
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      WITH
      booking_stats AS (
        SELECT
          b.customer_id                                                          AS person_id,
          EXTRACT(EPOCH FROM (NOW() - MAX(b.starts_at))) / 86400.0              AS days_since_last_booking,
          COUNT(CASE WHEN b.starts_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_last_30,
          COUNT(CASE WHEN b.starts_at >= NOW() - INTERVAL '60 days'
                      AND b.starts_at <  NOW() - INTERVAL '30 days' THEN 1 END) AS bookings_prev_30,
          COALESCE(SUM(CASE WHEN b.starts_at >= NOW() - INTERVAL '12 months'
                              AND b.payment_status IN ('paid','partial')
                             THEN ROUND(b.price * 100) END), 0)                 AS booking_revenue_12m_pence,
          COUNT(CASE WHEN b.starts_at >= NOW() - INTERVAL '12 months'
                      AND b.status != 'cancelled' THEN 1 END)                   AS booking_count_12m,
          MIN(b.starts_at)                                                       AS first_booking_at
        FROM booking.bookings b
        WHERE b.tenant_id = '${tenantId}'
          AND b.status != 'cancelled'
          AND b.customer_id IS NOT NULL
        GROUP BY b.customer_id
      ),
      membership_stats AS (
        SELECT
          m.customer_id                                                          AS person_id,
          m.status,
          m.auto_renew,
          EXTRACT(EPOCH FROM (m.renewal_date - NOW())) / 86400.0                AS days_to_renewal,
          COALESCE(mp.price, 0) * 100                                            AS annual_value_pence,
          EXTRACT(EPOCH FROM (NOW() - m.activated_at)) / (30.0 * 86400.0)      AS tenure_months
        FROM membership.memberships m
        LEFT JOIN membership.membership_plans mp ON mp.id = m.plan_id
        WHERE m.tenant_id = '${tenantId}'
          AND m.status = 'active'
      ),
      payment_stats AS (
        SELECT
          p.customer_id                                                                AS person_id,
          COUNT(CASE WHEN p.status = 'failed'    AND p.created_at >= NOW() - INTERVAL '12 months' THEN 1 END) AS failed_12m,
          COUNT(CASE WHEN p.status = 'succeeded' AND p.created_at >= NOW() - INTERVAL '12 months' THEN 1 END) AS succeeded_12m,
          EXTRACT(EPOCH FROM (NOW() - MAX(CASE WHEN p.status = 'succeeded' THEN p.updated_at END))) / 86400.0 AS days_since_last_success
        FROM payment.payments p
        WHERE p.tenant_id = '${tenantId}'
        GROUP BY p.customer_id
      ),
      email_stats AS (
        SELECT
          ml.recipient_person_id                                                  AS person_id,
          COUNT(*)                                                                 AS emails_received,
          COUNT(CASE WHEN ml.opened_at IS NOT NULL THEN 1 END)                    AS emails_opened
        FROM comms.message_log ml
        WHERE ml.tenant_id = '${tenantId}'
          AND ml.channel = 'email'
          AND ml.sent_at >= NOW() - INTERVAL '90 days'
          AND ml.recipient_person_id IS NOT NULL
        GROUP BY ml.recipient_person_id
      ),
      coaching_stats AS (
        SELECT
          ls.customer_id                                                          AS person_id,
          COALESCE(SUM(CASE WHEN ls.starts_at >= NOW() - INTERVAL '12 months'
                              AND ls.status IN ('completed','confirmed')
                              AND ls.payment_status = 'paid'
                             THEN ROUND(ls.price_charged * 100) END), 0)         AS coaching_revenue_12m_pence
        FROM coaching.lesson_sessions ls
        WHERE ls.tenant_id = '${tenantId}'
          AND ls.customer_id IS NOT NULL
        GROUP BY ls.customer_id
      ),
      no_show_stats AS (
        SELECT
          b.customer_id                                                           AS person_id,
          COUNT(CASE WHEN sp.status = 'no_show' THEN 1 END)                      AS no_shows,
          COUNT(sp.id)                                                            AS total_sessions
        FROM booking.bookings b
        JOIN booking.session_participants sp ON sp.booking_id = b.id
        WHERE b.tenant_id = '${tenantId}'
          AND b.starts_at >= NOW() - INTERVAL '90 days'
          AND b.customer_id IS NOT NULL
        GROUP BY b.customer_id
      )
      SELECT
        p.id                                                                      AS person_id,
        p.tenant_id,
        bs.days_since_last_booking,
        COALESCE(bs.bookings_last_30, 0)                                          AS bookings_last_30,
        COALESCE(bs.bookings_prev_30, 0)                                          AS bookings_prev_30,
        ms.status                                                                  AS membership_status,
        ms.auto_renew,
        ms.days_to_renewal,
        COALESCE(es.emails_received, 0)                                           AS emails_received_90d,
        COALESCE(es.emails_opened, 0)                                             AS emails_opened_90d,
        COALESCE(bs.booking_revenue_12m_pence, 0)                                 AS booking_revenue_12m_pence,
        COALESCE(bs.booking_count_12m, 0)                                         AS booking_count_12m,
        COALESCE(ms.annual_value_pence, 0)                                        AS membership_annual_pence,
        bs.first_booking_at,
        COALESCE(cs.coaching_revenue_12m_pence, 0)                                AS coaching_revenue_12m_pence,
        COALESCE(ps.failed_12m, 0)                                                AS failed_payments_12m,
        COALESCE(ps.succeeded_12m, 0)                                             AS succeeded_payments_12m,
        ms.tenure_months,
        (ms.status IS NOT NULL)                                                    AS has_active_membership,
        ps.days_since_last_success,
        COALESCE(ns.no_shows, 0)                                                  AS no_show_count_90d,
        COALESCE(ns.total_sessions, 0)                                            AS total_sessions_90d
      FROM people.customers p
      LEFT JOIN booking_stats    bs ON bs.person_id = p.id
      LEFT JOIN membership_stats ms ON ms.person_id = p.id
      LEFT JOIN payment_stats    ps ON ps.person_id = p.id
      LEFT JOIN email_stats      es ON es.person_id = p.id
      LEFT JOIN coaching_stats   cs ON cs.person_id = p.id
      LEFT JOIN no_show_stats    ns ON ns.person_id = p.id
      WHERE p.tenant_id = '${tenantId}'
        AND p.lifecycle_state IN ('active', 'suspended')
        AND p.merged_into_id IS NULL
    `)

    // Fetch email open hours separately (array aggregation is complex inline)
    const hourRows = await this.prisma.write.$queryRawUnsafe<Array<{ person_id: string; opened_hours: number[] }>>(
      `SELECT recipient_person_id AS person_id,
              array_agg(EXTRACT(HOUR FROM opened_at)::int) AS opened_hours
       FROM comms.message_log
       WHERE tenant_id = '${tenantId}'
         AND channel = 'email'
         AND opened_at IS NOT NULL
         AND sent_at >= NOW() - INTERVAL '90 days'
         AND recipient_person_id IS NOT NULL
       GROUP BY recipient_person_id`
    )

    const hourMap = new Map<string, number[]>()
    for (const row of hourRows) {
      hourMap.set(row.person_id, row.opened_hours ?? [])
    }

    return rows.map((r) => ({
      personId: r['person_id'] as string,
      tenantId: r['tenant_id'] as string,
      daysSinceLastBooking: r['days_since_last_booking'] != null ? Number(r['days_since_last_booking']) : null,
      bookingsLast30Days: Number(r['bookings_last_30'] ?? 0),
      bookingsPrev30Days: Number(r['bookings_prev_30'] ?? 0),
      membershipStatus: (r['membership_status'] as string) ?? null,
      autoRenew: r['auto_renew'] != null ? Boolean(r['auto_renew']) : null,
      daysToRenewal: r['days_to_renewal'] != null ? Number(r['days_to_renewal']) : null,
      emailsReceived90Days: Number(r['emails_received_90d'] ?? 0),
      emailsOpened90Days: Number(r['emails_opened_90d'] ?? 0),
      bookingRevenue12mPence: Number(r['booking_revenue_12m_pence'] ?? 0),
      bookingCount12m: Number(r['booking_count_12m'] ?? 0),
      membershipAnnualValuePence: Number(r['membership_annual_pence'] ?? 0),
      memberFirstBookingAt: r['first_booking_at'] ? new Date(r['first_booking_at'] as string) : null,
      coachingRevenue12mPence: Number(r['coaching_revenue_12m_pence'] ?? 0),
      failedPayments12m: Number(r['failed_payments_12m'] ?? 0),
      successfulPayments12m: Number(r['succeeded_payments_12m'] ?? 0),
      membershipTenureMonths: r['tenure_months'] != null ? Number(r['tenure_months']) : null,
      hasActiveMembership: Boolean(r['has_active_membership']),
      recentSuccessfulPaymentDays: r['days_since_last_success'] != null ? Number(r['days_since_last_success']) : null,
      noShowCount90Days: Number(r['no_show_count_90d'] ?? 0),
      totalSessionsWithStatus90Days: Number(r['total_sessions_90d'] ?? 0),
      openedHours: hourMap.get(r['person_id'] as string) ?? [],
    }))
  }

  async upsertScore(data: {
    tenantId: string
    personId: string
    churnRisk: number
    churnBand: string
    churnFactors: object
    ltvScore: number
    ltvFactors: object
    defaultRisk: number
    defaultBand: string
    defaultFactors: object
    optimalSendHour: number | null
    sendHourConfidence: number | null
  }) {
    return this.prisma.write.memberScore.upsert({
      where: { tenantId_personId: { tenantId: data.tenantId, personId: data.personId } },
      create: { ...data, computedAt: new Date() },
      update: { ...data, computedAt: new Date() },
    })
  }

  async findByTenant(tenantId: string, page = 1, limit = 50, minChurnRisk?: number) {
    const where = {
      tenantId,
      ...(minChurnRisk !== undefined ? { churnRisk: { gte: minChurnRisk } } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.read.memberScore.findMany({
        where,
        orderBy: { churnRisk: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.read.memberScore.count({ where }),
    ])
    return { data, total }
  }

  async findByPersonId(tenantId: string, personId: string) {
    return this.prisma.read.memberScore.findUnique({
      where: { tenantId_personId: { tenantId, personId } },
    })
  }

  async findByPersonIds(tenantId: string, personIds: string[]) {
    return this.prisma.read.memberScore.findMany({
      where: { tenantId, personId: { in: personIds } },
    })
  }

  async getActiveTenantIds(): Promise<string[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<{ tenant_id: string }>>(
      `SELECT DISTINCT tenant_id FROM people.customers WHERE lifecycle_state IN ('active','suspended') LIMIT 200`
    )
    return rows.map((r) => r.tenant_id)
  }
}
