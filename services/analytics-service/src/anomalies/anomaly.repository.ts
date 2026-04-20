import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AnomalyRuleResult } from './anomaly.rules.js'
import { ANOMALY_RULES, describeRule } from './anomaly.rules.js'

@Injectable()
export class AnomalyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Detection queries ──────────────────────────────────────────────────────

  async detectDormantSpikes(tenantId: string): Promise<AnomalyRuleResult[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      WITH recent_activity AS (
        SELECT
          customer_id,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS bookings_24h,
          MAX(created_at) FILTER (WHERE created_at < NOW() - INTERVAL '24 hours') AS last_before_spike
        FROM booking.bookings
        WHERE tenant_id = '${tenantId}'
          AND status NOT IN ('cancelled')
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      )
      SELECT
        customer_id::text AS person_id,
        bookings_24h::int,
        EXTRACT(EPOCH FROM (NOW() - last_before_spike)) / 86400.0 AS dormant_days
      FROM recent_activity
      WHERE bookings_24h >= 5
        AND (last_before_spike IS NULL OR last_before_spike < NOW() - INTERVAL '60 days')
    `)

    return rows.map(r => {
      const meta = {
        bookingCount: Number(r['bookings_24h']),
        dormantDays: Math.round(Number(r['dormant_days'] ?? 9999)),
      }
      return {
        ruleId: ANOMALY_RULES.DORMANT_SPIKE,
        severity: 'alert' as const,
        description: describeRule(ANOMALY_RULES.DORMANT_SPIKE, meta),
        personId: r['person_id'] as string,
        entityType: 'person',
        entityId: r['person_id'] as string,
        metadata: meta,
      }
    })
  }

  async detectPaymentFailureSpikes(tenantId: string): Promise<AnomalyRuleResult[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        customer_id::text AS person_id,
        COUNT(*)::int     AS failure_count
      FROM payment.payments
      WHERE tenant_id = '${tenantId}'
        AND status = 'failed'
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND customer_id IS NOT NULL
      GROUP BY customer_id
      HAVING COUNT(*) >= 3
    `)

    return rows.map(r => {
      const meta = { failureCount: Number(r['failure_count']) }
      return {
        ruleId: ANOMALY_RULES.PAYMENT_FAILURE_SPIKE,
        severity: 'alert' as const,
        description: describeRule(ANOMALY_RULES.PAYMENT_FAILURE_SPIKE, meta),
        personId: r['person_id'] as string,
        entityType: 'person',
        entityId: r['person_id'] as string,
        metadata: meta,
      }
    })
  }

  async detectCourtHoarding(tenantId: string): Promise<AnomalyRuleResult[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        customer_id::text       AS person_id,
        bookable_unit_id::text  AS unit_id,
        COUNT(*)::int           AS booking_count
      FROM booking.bookings
      WHERE tenant_id = '${tenantId}'
        AND status NOT IN ('cancelled')
        AND starts_at >= NOW() - INTERVAL '7 days'
        AND customer_id IS NOT NULL
        AND bookable_unit_id IS NOT NULL
      GROUP BY customer_id, bookable_unit_id
      HAVING COUNT(*) >= 7
    `)

    return rows.map(r => {
      const meta = { bookingCount: Number(r['booking_count']), unitId: r['unit_id'] as string }
      return {
        ruleId: ANOMALY_RULES.COURT_HOARDING,
        severity: 'warning' as const,
        description: describeRule(ANOMALY_RULES.COURT_HOARDING, meta),
        personId: r['person_id'] as string,
        entityType: 'booking',
        entityId: r['unit_id'] as string,
        metadata: meta,
      }
    })
  }

  async detectExtremeDurations(tenantId: string): Promise<AnomalyRuleResult[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        id::text           AS booking_id,
        customer_id::text  AS person_id,
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0 AS duration_hours
      FROM booking.bookings
      WHERE tenant_id = '${tenantId}'
        AND status NOT IN ('cancelled')
        AND ends_at > starts_at
        AND EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0 > 6
        AND created_at >= NOW() - INTERVAL '7 days'
    `)

    return rows.map(r => {
      const meta = { durationHours: Math.round(Number(r['duration_hours']) * 10) / 10 }
      return {
        ruleId: ANOMALY_RULES.BOOKING_DURATION_EXTREME,
        severity: 'warning' as const,
        description: describeRule(ANOMALY_RULES.BOOKING_DURATION_EXTREME, meta),
        personId: r['person_id'] as string | undefined,
        entityType: 'booking',
        entityId: r['booking_id'] as string,
        metadata: meta,
      }
    })
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  async upsertFlags(tenantId: string, flags: AnomalyRuleResult[]): Promise<number> {
    if (flags.length === 0) return 0
    let inserted = 0

    for (const flag of flags) {
      // Skip if an unresolved flag for same entity+rule already exists in last 24h
      const existing = await this.prisma.write.anomalyFlag.findFirst({
        where: {
          tenantId,
          entityId: flag.entityId,
          ruleId: flag.ruleId,
          resolvedAt: null,
          createdAt: { gte: new Date(Date.now() - 86400_000) },
        },
      })
      if (existing) continue

      await this.prisma.write.anomalyFlag.create({
        data: {
          tenantId,
          personId: flag.personId ?? null,
          entityType: flag.entityType,
          entityId: flag.entityId,
          ruleId: flag.ruleId,
          severity: flag.severity,
          description: flag.description,
          metadata: flag.metadata,
        },
      })
      inserted++
    }
    return inserted
  }

  async listFlags(
    tenantId: string,
    opts: { page: number; limit: number; unresolvedOnly: boolean; severity?: string },
  ) {
    const skip = (opts.page - 1) * opts.limit
    const where = {
      tenantId,
      ...(opts.unresolvedOnly ? { resolvedAt: null } : {}),
      ...(opts.severity ? { severity: opts.severity } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.read.anomalyFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: opts.limit,
      }),
      this.prisma.read.anomalyFlag.count({ where }),
    ])
    return { data, total }
  }

  async resolveFlag(tenantId: string, id: string): Promise<void> {
    await this.prisma.write.anomalyFlag.updateMany({
      where: { id, tenantId },
      data: { resolvedAt: new Date() },
    })
  }

  async getActiveTenantIds(): Promise<string[]> {
    const rows = await this.prisma.read.$queryRawUnsafe<Array<{ tenant_id: string }>>(`
      SELECT DISTINCT tenant_id::text FROM analytics.member_scores
    `)
    return rows.map(r => r.tenant_id)
  }
}
