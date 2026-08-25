import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface OverlapRow {
  id: string
  bookableUnitId: string
  startsAt: Date
  endsAt: Date
  bookingReference: string
}

interface DayBookingRow {
  id: string
  tenantId: string
  venueId: string
  resourceId: string
  bookableUnitId: string
  bookingReference: string
  startsAt: Date
  endsAt: Date
  status: string
}

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverlappingBookings(
    tenantId: string,
    unitIds: string[],
    startsAt: string,
    endsAt: string,
  ): Promise<OverlapRow[]> {
    return this.prisma.read.$queryRaw<OverlapRow[]>`
      SELECT
        id,
        bookable_unit_id AS "bookableUnitId",
        starts_at        AS "startsAt",
        ends_at          AS "endsAt",
        booking_reference AS "bookingReference"
      FROM booking.bookings
      WHERE tenant_id        = ${tenantId}::uuid
        AND status          <> 'cancelled'
        AND bookable_unit_id = ANY(${unitIds}::uuid[])
        AND starts_at        < ${endsAt}::timestamptz
        AND ends_at          > ${startsAt}::timestamptz
    `
  }

  async getBookingsForDay(
    tenantId: string,
    venueId: string,
    dayStart: string,
    dayEnd: string,
  ): Promise<DayBookingRow[]> {
    return this.prisma.read.$queryRaw<DayBookingRow[]>`
      SELECT
        id,
        tenant_id        AS "tenantId",
        venue_id         AS "venueId",
        resource_id      AS "resourceId",
        bookable_unit_id AS "bookableUnitId",
        booking_reference AS "bookingReference",
        starts_at        AS "startsAt",
        ends_at          AS "endsAt",
        status
      FROM booking.bookings
      WHERE tenant_id = ${tenantId}::uuid
        AND venue_id  = ${venueId}::uuid
        AND status   <> 'cancelled'
        AND starts_at < ${dayEnd}::timestamptz
        AND ends_at   > ${dayStart}::timestamptz
      ORDER BY starts_at
    `
  }

  /**
   * Checks whether any coaching session in the coaching schema occupies the
   * same bookable unit during the requested window.
   *
   * This is a cross-schema read (booking-service DB user → coaching schema).
   * coaching.lesson_sessions must have bookable_unit_id populated for a session
   * to participate in conflict detection (sessions without a unit are ignored).
   *
   * Gap 1 fix: coaching sessions are now visible to the booking availability check.
   */
  async getCoachingSessionConflicts(
    tenantId: string,
    unitIds: string[],
    startsAt: string,
    endsAt: string,
  ): Promise<{ id: string }[]> {
    if (unitIds.length === 0) return []
    return this.prisma.read.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM coaching.lesson_sessions
      WHERE tenant_id        = ${tenantId}::uuid
        AND status          <> 'cancelled'
        AND bookable_unit_id IS NOT NULL
        AND bookable_unit_id = ANY(${unitIds}::uuid[])
        AND starts_at        < ${endsAt}::timestamptz
        AND ends_at          > ${startsAt}::timestamptz
    `
  }

  /**
   * Loads ALL unit conflicts for a set of unit IDs in a SINGLE query.
   * Fixes the N+1: previously getDayAvailability called getConflictingUnits()
   * once per unit in a loop. Now it's O(1) regardless of unit count.
   *
   * Returns a Map: unitId → [unitId, ...conflictingUnitIds]
   */
  async getConflictMapForUnits(
    tenantId: string,
    unitIds: string[],
  ): Promise<Map<string, string[]>> {
    if (unitIds.length === 0) return new Map()

    const rows = await this.prisma.read.$queryRaw<
      { sourceUnitId: string; conflictingUnitId: string }[]
    >`
      SELECT DISTINCT
        CASE
          WHEN unit_id = ANY(${unitIds}::uuid[]) THEN unit_id::text
          ELSE conflicting_unit_id::text
        END AS "sourceUnitId",
        CASE
          WHEN unit_id = ANY(${unitIds}::uuid[]) THEN conflicting_unit_id::text
          ELSE unit_id::text
        END AS "conflictingUnitId"
      FROM venue.unit_conflicts conflict
      JOIN venue.bookable_units unit_row
        ON unit_row.id = conflict.unit_id
       AND unit_row.tenant_id = ${tenantId}::uuid
      JOIN venue.bookable_units conflicting_row
        ON conflicting_row.id = conflict.conflicting_unit_id
       AND conflicting_row.tenant_id = ${tenantId}::uuid
      WHERE conflict.unit_id = ANY(${unitIds}::uuid[])
         OR conflict.conflicting_unit_id = ANY(${unitIds}::uuid[])
    `

    // Initialise every unit with itself
    const map = new Map<string, string[]>()
    for (const id of unitIds) {
      map.set(id, [id])
    }

    // Add conflicts from the single query result — both directions.
    // The CASE-based SQL pivot only emits one row per conflict pair, so when
    // both sides are in unitIds the parent never gets the child added to its
    // list. Populating the reverse direction here fixes that.
    for (const row of rows) {
      const list = map.get(row.sourceUnitId)
      if (list && !list.includes(row.conflictingUnitId)) {
        list.push(row.conflictingUnitId)
      }

      // Reverse: if the conflicting unit is also tracked, add the source to it
      const reverseList = map.get(row.conflictingUnitId)
      if (reverseList && !reverseList.includes(row.sourceUnitId)) {
        reverseList.push(row.sourceUnitId)
      }
    }

    return map
  }
}
