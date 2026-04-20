import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { SlotHistoryRow } from './forecasting.algorithms.js'

@Injectable()
export class ForecastingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSlotHistory(tenantId: string, weeksBack = 8): Promise<SlotHistoryRow[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      WITH weekly_slots AS (
        SELECT
          b.bookable_unit_id                              AS unit_id,
          EXTRACT(DOW FROM b.starts_at)::int             AS day_of_week,
          EXTRACT(HOUR FROM b.starts_at)::int            AS hour_slot,
          DATE_TRUNC('week', b.starts_at)                AS booking_week
        FROM booking.bookings b
        WHERE b.tenant_id = '${tenantId}'
          AND b.status NOT IN ('cancelled', 'no_show')
          AND b.starts_at >= NOW() - INTERVAL '${weeksBack} weeks'
          AND b.bookable_unit_id IS NOT NULL
      ),
      slot_weeks AS (
        SELECT
          unit_id,
          day_of_week,
          hour_slot,
          COUNT(DISTINCT booking_week)  AS booked_weeks
        FROM weekly_slots
        GROUP BY unit_id, day_of_week, hour_slot
      )
      SELECT
        unit_id::text,
        day_of_week,
        hour_slot,
        booked_weeks::int,
        ${weeksBack}            AS total_weeks
      FROM slot_weeks
      ORDER BY unit_id, day_of_week, hour_slot
    `)

    return rows.map(r => ({
      unitId: r['unit_id'] as string,
      dayOfWeek: Number(r['day_of_week']),
      hourSlot: Number(r['hour_slot']),
      bookedWeeks: Number(r['booked_weeks']),
      totalWeeks: Number(r['total_weeks']),
    }))
  }

  async upsertForecasts(
    tenantId: string,
    slots: Array<{
      unitId: string
      forecastDate: string
      hourSlot: number
      predictedOccupancy: number
      historicalWeeks: number
      isDeadSlot: boolean
    }>,
  ): Promise<void> {
    if (slots.length === 0) return

    await this.prisma.write.$transaction(
      slots.map(s =>
        this.prisma.write.forecastSlot.upsert({
          where: {
            tenantId_unitId_forecastDate_hourSlot: {
              tenantId,
              unitId: s.unitId,
              forecastDate: new Date(s.forecastDate),
              hourSlot: s.hourSlot,
            },
          },
          create: {
            tenantId,
            unitId: s.unitId,
            forecastDate: new Date(s.forecastDate),
            hourSlot: s.hourSlot,
            predictedOccupancy: s.predictedOccupancy,
            historicalWeeks: s.historicalWeeks,
            isDeadSlot: s.isDeadSlot,
          },
          update: {
            predictedOccupancy: s.predictedOccupancy,
            historicalWeeks: s.historicalWeeks,
            isDeadSlot: s.isDeadSlot,
            computedAt: new Date(),
          },
        }),
      ),
    )
  }

  async getForecasts(
    tenantId: string,
    params: { fromDate: string; toDate: string; unitId?: string; deadSlotsOnly?: boolean },
  ) {
    return this.prisma.read.forecastSlot.findMany({
      where: {
        tenantId,
        forecastDate: { gte: new Date(params.fromDate), lte: new Date(params.toDate) },
        ...(params.unitId ? { unitId: params.unitId } : {}),
        ...(params.deadSlotsOnly ? { isDeadSlot: true } : {}),
      },
      orderBy: [{ forecastDate: 'asc' }, { hourSlot: 'asc' }],
    })
  }

  async getDeadSlots(tenantId: string, fromDaysAhead = 3, toDaysAhead = 14) {
    const from = new Date()
    from.setDate(from.getDate() + fromDaysAhead)
    const to = new Date()
    to.setDate(to.getDate() + toDaysAhead)

    return this.prisma.read.forecastSlot.findMany({
      where: {
        tenantId,
        isDeadSlot: true,
        forecastDate: { gte: from, lte: to },
      },
      orderBy: [{ predictedOccupancy: 'asc' }, { forecastDate: 'asc' }],
    })
  }

  // Returns person IDs who have booked this unit in the last 6 months
  async getPreviousBookers(tenantId: string, unitId: string): Promise<string[]> {
    const rows = await this.prisma.write.$queryRawUnsafe<Array<{ person_id: string }>>(`
      SELECT DISTINCT b.customer_id AS person_id
      FROM booking.bookings b
      WHERE b.tenant_id = '${tenantId}'
        AND b.bookable_unit_id = '${unitId}'
        AND b.status NOT IN ('cancelled')
        AND b.starts_at >= NOW() - INTERVAL '6 months'
        AND b.customer_id IS NOT NULL
      LIMIT 200
    `)
    return rows.map(r => r.person_id)
  }

  async getActiveTenantIds(): Promise<string[]> {
    const rows = await this.prisma.read.$queryRawUnsafe<Array<{ tenant_id: string }>>(`
      SELECT DISTINCT tenant_id::text FROM analytics.member_scores
    `)
    return rows.map(r => r.tenant_id)
  }
}
