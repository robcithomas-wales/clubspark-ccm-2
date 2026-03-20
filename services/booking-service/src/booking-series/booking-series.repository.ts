import { Injectable } from '@nestjs/common'
import { RRule } from 'rrule'
import { PrismaService } from '../prisma/prisma.service.js'
import { Prisma } from '../generated/prisma/index.js'
import { randomBytes } from 'crypto'
import type { CreateBookingSeriesDto } from './dto/create-booking-series.dto.js'
import type { UpdateBookingSeriesDto } from './dto/update-booking-series.dto.js'
import type { BookingRow } from '../bookings/bookings.repository.js'

function generateBookingReference(): string {
  return `BK-${randomBytes(5).toString('hex').toUpperCase()}`
}

export interface SeriesRow {
  id: string
  tenantId: string
  organisationId: string | null
  venueId: string
  resourceId: string
  bookableUnitId: string
  customerId: string | null
  bookingSource: string | null
  rrule: string
  slotStartsAt: string
  slotEndsAt: string
  paymentStatus: string
  notes: string | null
  status: string
  minSessions: number | null
  maxSessions: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Given an RRULE string and a reference datetime (first occurrence),
 * expands occurrences and returns {startsAt, endsAt} pairs preserving
 * the original slot duration.
 */
function expandOccurrences(
  rruleStr: string,
  firstStartsAt: Date,
  firstEndsAt: Date,
): Array<{ startsAt: Date; endsAt: Date }> {
  const durationMs = firstEndsAt.getTime() - firstStartsAt.getTime()

  const rule = RRule.fromString(
    rruleStr.startsWith('RRULE:') ? rruleStr : `RRULE:${rruleStr}`,
  )

  // Override dtstart to match the first occurrence
  const withDtstart = new RRule({
    ...rule.origOptions,
    dtstart: firstStartsAt,
  })

  const dates = withDtstart.all()

  return dates.map((date) => ({
    startsAt: date,
    endsAt: new Date(date.getTime() + durationMs),
  }))
}

@Injectable()
export class BookingSeriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<SeriesRow[]> {
    return this.prisma.read.$queryRaw<SeriesRow[]>`
      SELECT
        id,
        tenant_id          AS "tenantId",
        organisation_id    AS "organisationId",
        venue_id           AS "venueId",
        resource_id        AS "resourceId",
        bookable_unit_id   AS "bookableUnitId",
        customer_id        AS "customerId",
        booking_source     AS "bookingSource",
        rrule,
        slot_starts_at     AS "slotStartsAt",
        slot_ends_at       AS "slotEndsAt",
        payment_status     AS "paymentStatus",
        notes,
        status,
        min_sessions       AS "minSessions",
        max_sessions       AS "maxSessions",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
      FROM booking.booking_series
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `
  }

  async findById(tenantId: string, id: string): Promise<SeriesRow | null> {
    const rows = await this.prisma.read.$queryRaw<SeriesRow[]>`
      SELECT
        id,
        tenant_id          AS "tenantId",
        organisation_id    AS "organisationId",
        venue_id           AS "venueId",
        resource_id        AS "resourceId",
        bookable_unit_id   AS "bookableUnitId",
        customer_id        AS "customerId",
        booking_source     AS "bookingSource",
        rrule,
        slot_starts_at     AS "slotStartsAt",
        slot_ends_at       AS "slotEndsAt",
        payment_status     AS "paymentStatus",
        notes,
        status,
        min_sessions       AS "minSessions",
        max_sessions       AS "maxSessions",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
      FROM booking.booking_series
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
    `
    return rows[0] ?? null
  }

  async findBookingsForSeries(tenantId: string, seriesId: string): Promise<BookingRow[]> {
    return this.prisma.read.$queryRaw<BookingRow[]>`
      SELECT
        b.id,
        b.tenant_id          AS "tenantId",
        b.organisation_id    AS "organisationId",
        b.venue_id           AS "venueId",
        b.resource_id        AS "resourceId",
        b.bookable_unit_id   AS "bookableUnitId",
        b.customer_id        AS "customerId",
        b.booking_source     AS "bookingSource",
        b.starts_at          AS "startsAt",
        b.ends_at            AS "endsAt",
        b.status,
        b.payment_status     AS "paymentStatus",
        b.booking_reference  AS "bookingReference",
        b.notes,
        b.series_id          AS "seriesId",
        b.cancelled_at       AS "cancelledAt",
        b.created_at         AS "createdAt",
        b.updated_at         AS "updatedAt",
        c.first_name         AS "customerFirstName",
        c.last_name          AS "customerLastName",
        c.email              AS "customerEmail",
        c.phone              AS "customerPhone"
      FROM booking.bookings b
      LEFT JOIN customer.customers c ON c.id = b.customer_id
      WHERE b.tenant_id = ${tenantId}::uuid
        AND b.series_id = ${seriesId}::uuid
      ORDER BY b.starts_at ASC
    `
  }

  /**
   * Creates the series record and all expanded bookings atomically.
   * Returns {series, bookings}.
   */
  async createWithBookings(
    tenantId: string,
    organisationId: string,
    unitIds: string[],
    dto: CreateBookingSeriesDto,
  ) {
    const firstStartsAt = new Date(dto.startsAt)
    const firstEndsAt = new Date(dto.endsAt)
    const allOccurrences = expandOccurrences(dto.rrule, firstStartsAt, firstEndsAt)

    if (allOccurrences.length === 0) {
      throw new Error('RRULE produced no occurrences')
    }

    // Enforce minSessions: RRULE must produce at least this many occurrences
    if (dto.minSessions && allOccurrences.length < dto.minSessions) {
      throw new Error(`MIN_SESSIONS_NOT_MET:${allOccurrences.length}:${dto.minSessions}`)
    }

    // Enforce maxSessions: cap occurrences to this many (truncate the rest)
    const occurrences = dto.maxSessions && allOccurrences.length > dto.maxSessions
      ? allOccurrences.slice(0, dto.maxSessions)
      : allOccurrences

    const slotStartsAt = firstStartsAt.toTimeString().slice(0, 8) // "HH:MM:SS"
    const slotEndsAt = firstEndsAt.toTimeString().slice(0, 8)
    const paymentStatus = dto.paymentStatus ?? 'unpaid'

    return this.prisma.write.$transaction(
      async (tx) => {
        // Insert the series record
        const seriesRows = await tx.$queryRaw<SeriesRow[]>`
          INSERT INTO booking.booking_series (
            tenant_id, organisation_id, venue_id, resource_id,
            bookable_unit_id, customer_id, booking_source,
            rrule, slot_starts_at, slot_ends_at,
            payment_status, notes, status, min_sessions, max_sessions
          ) VALUES (
            ${tenantId}::uuid,
            ${organisationId}::uuid,
            ${dto.venueId}::uuid,
            ${dto.resourceId}::uuid,
            ${dto.bookableUnitId}::uuid,
            ${dto.customerId ?? null}::uuid,
            ${dto.bookingSource ?? null},
            ${dto.rrule},
            ${slotStartsAt}::time,
            ${slotEndsAt}::time,
            ${paymentStatus},
            ${dto.notes ?? null},
            'active',
            ${dto.minSessions ?? null},
            ${dto.maxSessions ?? null}
          )
          RETURNING
            id,
            tenant_id        AS "tenantId",
            organisation_id  AS "organisationId",
            venue_id         AS "venueId",
            resource_id      AS "resourceId",
            bookable_unit_id AS "bookableUnitId",
            customer_id      AS "customerId",
            booking_source   AS "bookingSource",
            rrule,
            slot_starts_at   AS "slotStartsAt",
            slot_ends_at     AS "slotEndsAt",
            payment_status   AS "paymentStatus",
            notes,
            status,
            min_sessions     AS "minSessions",
            max_sessions     AS "maxSessions",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
        `
        const series = seriesRows[0]!


        // Conflict check across all occurrences in one query
        const starts = occurrences.map((o) => o.startsAt.toISOString())
        const ends = occurrences.map((o) => o.endsAt.toISOString())

        const conflicts = await tx.$queryRaw<{ id: string }[]>`
          SELECT b.id
          FROM booking.bookings b
          CROSS JOIN UNNEST(
            ${starts}::timestamptz[],
            ${ends}::timestamptz[]
          ) AS occ(occ_start, occ_end)
          WHERE b.tenant_id        = ${tenantId}::uuid
            AND b.status          <> 'cancelled'
            AND b.bookable_unit_id = ANY(${unitIds}::uuid[])
            AND b.starts_at        < occ.occ_end
            AND b.ends_at          > occ.occ_start
          LIMIT 1
        `

        if (conflicts.length > 0) {
          throw new Error('SERIES_CONFLICT')
        }

        // Insert all bookings
        const bookings: BookingRow[] = []
        for (const occ of occurrences) {
          const ref = generateBookingReference()
          const rows = await tx.$queryRaw<BookingRow[]>`
            INSERT INTO booking.bookings (
              tenant_id, organisation_id, venue_id, resource_id,
              bookable_unit_id, customer_id, booking_source,
              starts_at, ends_at, status, payment_status,
              booking_reference, notes, series_id
            ) VALUES (
              ${tenantId}::uuid,
              ${organisationId}::uuid,
              ${dto.venueId}::uuid,
              ${dto.resourceId}::uuid,
              ${dto.bookableUnitId}::uuid,
              ${dto.customerId ?? null}::uuid,
              ${dto.bookingSource ?? null},
              ${occ.startsAt.toISOString()}::timestamptz,
              ${occ.endsAt.toISOString()}::timestamptz,
              'active',
              ${paymentStatus},
              ${ref},
              ${dto.notes ?? null},
              ${series.id}::uuid
            )
            RETURNING
              id,
              tenant_id        AS "tenantId",
              organisation_id  AS "organisationId",
              venue_id         AS "venueId",
              resource_id      AS "resourceId",
              bookable_unit_id AS "bookableUnitId",
              customer_id      AS "customerId",
              booking_source   AS "bookingSource",
              starts_at        AS "startsAt",
              ends_at          AS "endsAt",
              status,
              payment_status   AS "paymentStatus",
              booking_reference AS "bookingReference",
              notes,
              series_id        AS "seriesId",
              cancelled_at     AS "cancelledAt",
              created_at       AS "createdAt",
              updated_at       AS "updatedAt"
          `
          if (rows[0]) bookings.push(rows[0])
        }

        return { series, bookings }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  }

  /** Cancel bookings in the series according to mode */
  async cancelBookings(
    tenantId: string,
    seriesId: string,
    mode: 'all' | 'from_date' | 'single',
    fromDate?: string,
    bookingId?: string,
  ): Promise<number> {
    if (mode === 'single' && bookingId) {
      const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
        UPDATE booking.bookings
        SET status       = 'cancelled',
            cancelled_at = now(),
            updated_at   = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND id        = ${bookingId}::uuid
          AND series_id = ${seriesId}::uuid
          AND status   <> 'cancelled'
        RETURNING id
      `
      return rows.length
    }

    if (mode === 'from_date' && fromDate) {
      const cutoff = new Date(fromDate)
      const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
        UPDATE booking.bookings
        SET status       = 'cancelled',
            cancelled_at = now(),
            updated_at   = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND series_id = ${seriesId}::uuid
          AND status   <> 'cancelled'
          AND starts_at >= ${cutoff.toISOString()}::timestamptz
        RETURNING id
      `
      return rows.length
    }

    // mode === 'all'
    const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
      UPDATE booking.bookings
      SET status       = 'cancelled',
          cancelled_at = now(),
          updated_at   = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND series_id = ${seriesId}::uuid
        AND status   <> 'cancelled'
      RETURNING id
    `

    // Mark the series itself as cancelled when all bookings are cancelled
    await this.prisma.write.$queryRaw`
      UPDATE booking.booking_series
      SET status     = 'cancelled',
          updated_at = now()
      WHERE id       = ${seriesId}::uuid
        AND tenant_id = ${tenantId}::uuid
    `

    return rows.length
  }

  /** Update booking fields according to mode */
  async updateBookings(
    tenantId: string,
    seriesId: string,
    dto: UpdateBookingSeriesDto,
  ): Promise<number> {
    const fields: Record<string, unknown> = {}
    if (dto.notes !== undefined) fields.notes = dto.notes
    if (dto.customerId !== undefined) fields.customer_id = dto.customerId
    if (dto.bookingSource !== undefined) fields.booking_source = dto.bookingSource
    if (dto.paymentStatus !== undefined) fields.payment_status = dto.paymentStatus

    if (Object.keys(fields).length === 0) return 0

    if (dto.mode === 'single' && dto.bookingId) {
      const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
        UPDATE booking.bookings
        SET
          notes          = COALESCE(${dto.notes ?? null}, notes),
          customer_id    = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
          booking_source = COALESCE(${dto.bookingSource ?? null}, booking_source),
          payment_status = COALESCE(${dto.paymentStatus ?? null}, payment_status),
          updated_at     = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND id        = ${dto.bookingId}::uuid
          AND series_id = ${seriesId}::uuid
          AND status   <> 'cancelled'
        RETURNING id
      `
      return rows.length
    }

    if (dto.mode === 'from_date' && dto.fromDate) {
      const cutoff = new Date(dto.fromDate)
      const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
        UPDATE booking.bookings
        SET
          notes          = COALESCE(${dto.notes ?? null}, notes),
          customer_id    = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
          booking_source = COALESCE(${dto.bookingSource ?? null}, booking_source),
          payment_status = COALESCE(${dto.paymentStatus ?? null}, payment_status),
          updated_at     = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND series_id = ${seriesId}::uuid
          AND status   <> 'cancelled'
          AND starts_at >= ${cutoff.toISOString()}::timestamptz
        RETURNING id
      `
      return rows.length
    }

    // mode === 'all'
    const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
      UPDATE booking.bookings
      SET
        notes          = COALESCE(${dto.notes ?? null}, notes),
        customer_id    = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
        booking_source = COALESCE(${dto.bookingSource ?? null}, booking_source),
        payment_status = COALESCE(${dto.paymentStatus ?? null}, payment_status),
        updated_at     = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND series_id = ${seriesId}::uuid
        AND status   <> 'cancelled'
      RETURNING id
    `
    return rows.length
  }
}
