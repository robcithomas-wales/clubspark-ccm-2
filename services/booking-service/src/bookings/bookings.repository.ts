import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { randomBytes } from 'crypto'
import { Prisma } from '../generated/prisma/index.js'
import type { CreateBookingDto } from './dto/create-booking.dto.js'
import type { CreateBookingAddOnDto } from './dto/create-booking-add-on.dto.js'
import type { PaymentStatus } from './dto/update-payment-status.dto.js'
import type { UpdateBookingDto } from './dto/update-booking.dto.js'

function generateBookingReference(): string {
  return `BK-${randomBytes(5).toString('hex').toUpperCase()}`
}

// Shape returned by booking queries (camelCase aliases)
export interface BookingRow {
  id: string
  tenantId: string
  organisationId: string | null
  venueId: string
  resourceId: string
  bookableUnitId: string
  customerId: string | null
  bookingSource: string | null
  startsAt: Date
  endsAt: Date
  status: string
  paymentStatus: string
  bookingReference: string
  notes: string | null
  optionalUnitIds: string[]
  adminOverride: boolean
  approvedBy: string | null
  approvedAt: Date | null
  seriesId: string | null
  cancelledAt: Date | null
  price: number | null
  currency: string
  createdAt: Date
  updatedAt: Date
  customerFirstName: string | null
  customerLastName: string | null
  customerEmail: string | null
  customerPhone: string | null
  venueName: string | null
  resourceName: string | null
  unitName: string | null
}

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    page: number,
    limit: number,
    filters: { status?: string; fromDate?: string; toDate?: string; customerId?: string } = {},
  ) {
    const offset = (page - 1) * limit

    const statusFilter = filters.status && filters.status !== 'all'
      ? Prisma.sql`AND b.status = ${filters.status}`
      : Prisma.empty

    const fromFilter = filters.fromDate
      ? Prisma.sql`AND b.starts_at >= ${filters.fromDate}::timestamptz`
      : Prisma.empty

    const toFilter = filters.toDate
      ? Prisma.sql`AND b.starts_at < ${filters.toDate}::timestamptz`
      : Prisma.empty

    const customerFilter = filters.customerId
      ? Prisma.sql`AND b.customer_id = ${filters.customerId}::uuid`
      : Prisma.empty

    const rows = await this.prisma.read.$queryRaw<Array<BookingRow & { totalCount: number }>>(
      Prisma.sql`
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
          b.optional_unit_ids  AS "optionalUnitIds",
          b.admin_override     AS "adminOverride",
          b.approved_by        AS "approvedBy",
          b.approved_at        AS "approvedAt",
          b.series_id          AS "seriesId",
          b.cancelled_at       AS "cancelledAt",
          b.price,
          b.currency,
          b.created_at         AS "createdAt",
          b.updated_at         AS "updatedAt",
          c.first_name         AS "customerFirstName",
          c.last_name          AS "customerLastName",
          c.email              AS "customerEmail",
          c.phone              AS "customerPhone",
          v.name               AS "venueName",
          r.name               AS "resourceName",
          u.name               AS "unitName",
          COUNT(*) OVER()::int AS "totalCount"
        FROM booking.bookings b
        LEFT JOIN people.persons c ON c.id = b.customer_id
        LEFT JOIN venue.venues v ON v.id = b.venue_id
        LEFT JOIN venue.resources r ON r.id = b.resource_id
        LEFT JOIN venue.bookable_units u ON u.id = b.bookable_unit_id
        WHERE b.tenant_id = ${tenantId}::uuid
        ${statusFilter}
        ${fromFilter}
        ${toFilter}
        ${customerFilter}
        ORDER BY b.starts_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    )

    const total: number = rows[0]?.totalCount ?? 0
    const data = rows.map(({ totalCount: _tc, ...row }) => row)
    return { rows: data, total }
  }

  async findById(tenantId: string, id: string): Promise<BookingRow | null> {
    const rows = await this.prisma.read.$queryRaw<BookingRow[]>(
      Prisma.sql`
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
          b.optional_unit_ids  AS "optionalUnitIds",
          b.admin_override     AS "adminOverride",
          b.approved_by        AS "approvedBy",
          b.approved_at        AS "approvedAt",
          b.series_id          AS "seriesId",
          b.cancelled_at       AS "cancelledAt",
          b.price,
          b.currency,
          b.created_at         AS "createdAt",
          b.updated_at         AS "updatedAt",
          c.first_name         AS "customerFirstName",
          c.last_name          AS "customerLastName",
          c.email              AS "customerEmail",
          c.phone              AS "customerPhone",
          v.name               AS "venueName",
          r.name               AS "resourceName",
          u.name               AS "unitName"
        FROM booking.bookings b
        LEFT JOIN people.persons c ON c.id = b.customer_id
        LEFT JOIN venue.venues v ON v.id = b.venue_id
        LEFT JOIN venue.resources r ON r.id = b.resource_id
        LEFT JOIN venue.bookable_units u ON u.id = b.bookable_unit_id
        WHERE b.tenant_id = ${tenantId}::uuid
          AND b.id = ${id}::uuid
      `,
    )
    return rows[0] ?? null
  }

  async exists(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.prisma.read.$queryRaw<{ id: string }[]>`
      SELECT id FROM booking.bookings
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      LIMIT 1
    `
    return rows.length > 0
  }

  async findBookableUnit(tenantId: string, bookableUnitId: string) {
    const rows = await this.prisma.read.$queryRaw<{
      id: string; tenantId: string; venueId: string; resourceId: string;
      name: string; unitType: string; isActive: boolean
    }[]>`
      SELECT
        id,
        tenant_id   AS "tenantId",
        venue_id    AS "venueId",
        resource_id AS "resourceId",
        name,
        unit_type   AS "unitType",
        is_active   AS "isActive"
      FROM venue.bookable_units
      WHERE id = ${bookableUnitId}::uuid AND tenant_id = ${tenantId}::uuid
    `
    return rows[0] ?? null
  }

  async findResourceGroupId(resourceId: string): Promise<string | null> {
    const rows = await this.prisma.read.$queryRaw<{ groupId: string | null }[]>`
      SELECT group_id AS "groupId"
      FROM venue.resources
      WHERE id = ${resourceId}::uuid
      LIMIT 1
    `
    return rows[0]?.groupId ?? null
  }

  /**
   * Atomically creates a booking inside a SERIALIZABLE transaction.
   *
   * SERIALIZABLE isolation means PostgreSQL guarantees that if two concurrent
   * transactions both read 0 conflicts and attempt an insert, one will succeed
   * and the other will fail with a serialization error (which we catch and
   * re-throw as ConflictException).
   *
   * The btree_gist exclusion constraint on booking.bookings is the final safety
   * net — it rejects any overlapping insert at the database level.
   */
  async createAtomic(
    tenantId: string,
    organisationId: string,
    unitIds: string[],
    dto: CreateBookingDto,
  ) {
    const bookingReference = generateBookingReference()

    try {
      return await this.prisma.write.$transaction(
        async (tx) => {
          // Check for overlapping bookings — in SERIALIZABLE mode this read
          // establishes a predicate lock that prevents phantom inserts
          const conflicts = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM booking.bookings
            WHERE tenant_id         = ${tenantId}::uuid
              AND status           <> 'cancelled'
              AND bookable_unit_id  = ANY(${unitIds}::uuid[])
              AND starts_at         < ${dto.endsAt}::timestamptz
              AND ends_at           > ${dto.startsAt}::timestamptz
          `

          if (conflicts.length > 0) {
            throw new ConflictException({
              message: 'Booking conflicts with an existing booking',
              code: 'BOOKING_CONFLICT',
              conflictIds: conflicts.map((c) => c.id),
            })
          }

          const optionalUnitIds = dto.optionalUnitIds ?? []
          const initialStatus = dto.status === 'pending' ? 'pending' : 'active'
          const rows = await tx.$queryRaw<BookingRow[]>`
            INSERT INTO booking.bookings (
              tenant_id, organisation_id, venue_id, resource_id,
              bookable_unit_id, customer_id, booking_source,
              starts_at, ends_at, status, payment_status, booking_reference, notes,
              optional_unit_ids, admin_override, price, currency
            ) VALUES (
              ${tenantId}::uuid,
              ${organisationId}::uuid,
              ${dto.venueId}::uuid,
              ${dto.resourceId}::uuid,
              ${dto.bookableUnitId}::uuid,
              ${dto.customerId ?? null}::uuid,
              ${dto.bookingSource ?? null},
              ${dto.startsAt}::timestamptz,
              ${dto.endsAt}::timestamptz,
              ${initialStatus},
              ${dto.paymentStatus ?? 'unpaid'},
              ${bookingReference},
              ${dto.notes ?? null},
              ${optionalUnitIds}::uuid[],
              ${dto.adminOverride ?? false},
              ${dto.price ?? null},
              ${dto.currency ?? 'GBP'}
            )
            RETURNING
              id,
              tenant_id         AS "tenantId",
              organisation_id   AS "organisationId",
              venue_id          AS "venueId",
              resource_id       AS "resourceId",
              bookable_unit_id  AS "bookableUnitId",
              customer_id       AS "customerId",
              booking_source    AS "bookingSource",
              starts_at         AS "startsAt",
              ends_at           AS "endsAt",
              status,
              payment_status    AS "paymentStatus",
              booking_reference AS "bookingReference",
              notes,
              optional_unit_ids AS "optionalUnitIds",
              admin_override    AS "adminOverride",
              approved_by       AS "approvedBy",
              approved_at       AS "approvedAt",
              cancelled_at      AS "cancelledAt",
              price,
              currency,
              created_at        AS "createdAt",
              updated_at        AS "updatedAt"
          `

          return rows[0]
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (err) {
      // Re-throw our own ConflictException unchanged
      if (err instanceof ConflictException) throw err

      // Serialization failure (code 40001) or exclusion constraint violation
      // (23P01) both mean a concurrent booking beat us to it
      const pg = err as { code?: string }
      if (pg.code === '40001' || pg.code === '23P01') {
        throw new ConflictException('Booking conflicts with an existing booking')
      }

      throw err
    }
  }

  async cancel(tenantId: string, id: string) {
    const rows = await this.prisma.write.$queryRaw<BookingRow[]>`
      UPDATE booking.bookings
      SET status       = 'cancelled',
          cancelled_at = now(),
          updated_at   = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ${id}::uuid
        AND status   <> 'cancelled'
      RETURNING
        id,
        tenant_id        AS "tenantId",
        venue_id         AS "venueId",
        resource_id      AS "resourceId",
        bookable_unit_id AS "bookableUnitId",
        status,
        booking_reference AS "bookingReference",
        starts_at        AS "startsAt",
        ends_at          AS "endsAt",
        cancelled_at     AS "cancelledAt",
        updated_at       AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async bulkCancel(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
      UPDATE booking.bookings
      SET status       = 'cancelled',
          cancelled_at = now(),
          updated_at   = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ANY(${ids}::uuid[])
        AND status   <> 'cancelled'
      RETURNING id
    `
    return rows.length
  }

  async updatePaymentStatus(tenantId: string, id: string, paymentStatus: PaymentStatus) {
    const rows = await this.prisma.write.$queryRaw<BookingRow[]>`
      UPDATE booking.bookings
      SET payment_status = ${paymentStatus},
          updated_at     = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ${id}::uuid
        AND status   <> 'cancelled'
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
        cancelled_at     AS "cancelledAt",
        created_at       AS "createdAt",
        updated_at       AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateBookingDto,
    newUnit?: { resourceId: string; venueId: string },
  ): Promise<BookingRow | null> {
    const returning = Prisma.sql`
      RETURNING
        id,
        tenant_id         AS "tenantId",
        organisation_id   AS "organisationId",
        venue_id          AS "venueId",
        resource_id       AS "resourceId",
        bookable_unit_id  AS "bookableUnitId",
        customer_id       AS "customerId",
        booking_source    AS "bookingSource",
        starts_at         AS "startsAt",
        ends_at           AS "endsAt",
        status,
        payment_status    AS "paymentStatus",
        booking_reference AS "bookingReference",
        notes,
        optional_unit_ids AS "optionalUnitIds",
        admin_override    AS "adminOverride",
        approved_by       AS "approvedBy",
        approved_at       AS "approvedAt",
        series_id         AS "seriesId",
        cancelled_at      AS "cancelledAt",
        created_at        AS "createdAt",
        updated_at        AS "updatedAt"
    `

    // Unit change requires a conflict-checked atomic transaction
    if (dto.bookableUnitId && newUnit) {
      try {
        return await this.prisma.write.$transaction(
          async (tx) => {
            // Read current times to use as fallback if not overridden
            const current = await tx.$queryRaw<{ startsAt: Date; endsAt: Date }[]>`
              SELECT starts_at AS "startsAt", ends_at AS "endsAt"
              FROM booking.bookings
              WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid AND status <> 'cancelled'
            `
            if (current.length === 0) return null

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const startsAt = dto.startsAt ?? current[0]!.startsAt.toISOString()
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const endsAt   = dto.endsAt   ?? current[0]!.endsAt.toISOString()

            const conflicts = await tx.$queryRaw<{ id: string }[]>`
              SELECT id FROM booking.bookings
              WHERE tenant_id        = ${tenantId}::uuid
                AND status          <> 'cancelled'
                AND id              <> ${id}::uuid
                AND bookable_unit_id = ${dto.bookableUnitId}::uuid
                AND starts_at        < ${endsAt}::timestamptz
                AND ends_at          > ${startsAt}::timestamptz
            `
            if (conflicts.length > 0) {
              throw new ConflictException('Unit is not available for the selected time slot')
            }

            const rows = await tx.$queryRaw<BookingRow[]>(
              Prisma.sql`
                UPDATE booking.bookings
                SET
                  bookable_unit_id  = ${dto.bookableUnitId}::uuid,
                  resource_id       = ${newUnit.resourceId}::uuid,
                  venue_id          = ${newUnit.venueId}::uuid,
                  starts_at         = COALESCE(${dto.startsAt ?? null}::timestamptz, starts_at),
                  ends_at           = COALESCE(${dto.endsAt ?? null}::timestamptz,   ends_at),
                  notes             = CASE WHEN ${dto.notes !== undefined} THEN ${dto.notes ?? null} ELSE notes END,
                  booking_source    = CASE WHEN ${dto.bookingSource !== undefined} THEN ${dto.bookingSource ?? null} ELSE booking_source END,
                  customer_id       = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
                  optional_unit_ids = CASE WHEN ${dto.optionalUnitIds !== undefined} THEN ${dto.optionalUnitIds ?? []}::uuid[] ELSE optional_unit_ids END,
                  admin_override    = CASE WHEN ${dto.adminOverride !== undefined} THEN ${dto.adminOverride ?? false} ELSE admin_override END,
                  updated_at        = now()
                WHERE tenant_id = ${tenantId}::uuid
                  AND id        = ${id}::uuid
                  AND status   <> 'cancelled'
                ${returning}
              `,
            )
            return rows[0] ?? null
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
      } catch (err) {
        if (err instanceof ConflictException) throw err
        const pg = err as { code?: string }
        if (pg.code === '40001' || pg.code === '23P01') {
          throw new ConflictException('Unit is not available for the selected time slot')
        }
        throw err
      }
    }

    const rows = await this.prisma.write.$queryRaw<BookingRow[]>(
      Prisma.sql`
        UPDATE booking.bookings
        SET
          starts_at         = COALESCE(${dto.startsAt ?? null}::timestamptz, starts_at),
          ends_at           = COALESCE(${dto.endsAt ?? null}::timestamptz,   ends_at),
          notes             = CASE WHEN ${dto.notes !== undefined} THEN ${dto.notes ?? null} ELSE notes END,
          booking_source    = CASE WHEN ${dto.bookingSource !== undefined} THEN ${dto.bookingSource ?? null} ELSE booking_source END,
          customer_id       = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
          optional_unit_ids = CASE WHEN ${dto.optionalUnitIds !== undefined} THEN ${dto.optionalUnitIds ?? []}::uuid[] ELSE optional_unit_ids END,
          admin_override    = CASE WHEN ${dto.adminOverride !== undefined} THEN ${dto.adminOverride ?? false} ELSE admin_override END,
          updated_at        = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND id        = ${id}::uuid
          AND status   <> 'cancelled'
        ${returning}
      `,
    )
    return rows[0] ?? null
  }

  async getStats(tenantId: string): Promise<{
    totalBookedHours: number
    bookedHours30d: number
    addOnRevenue: number
    totalRevenue: number
    totalPaidBookings: number
    uniqueCustomers: number
    utilisationRate30d: number
  }> {
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [bookingRows, addOnRows, customerRows, revenueRows, unitRows] = await Promise.all([
      this.prisma.read.$queryRaw<[{ totalBookedHours: number; bookedHours30d: number }]>`
        SELECT
          COALESCE(SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600)
            FILTER (WHERE status = 'active'), 0)::float AS "totalBookedHours",
          COALESCE(SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600)
            FILTER (WHERE status = 'active' AND starts_at >= ${cutoff30d}::timestamptz), 0)::float AS "bookedHours30d"
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid
      `,
      this.prisma.read.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM(ba.price * ba.quantity), 0)::float AS total
        FROM booking.booking_add_ons ba
        JOIN booking.bookings b ON b.id = ba.booking_id
        WHERE b.tenant_id = ${tenantId}::uuid AND ba.status = 'active'
      `,
      this.prisma.read.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT customer_id)::int AS count
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid AND status = 'active' AND customer_id IS NOT NULL
      `,
      this.prisma.read.$queryRaw<[{ totalRevenue: number; totalPaid: number }]>`
        SELECT
          COALESCE(SUM(price) FILTER (WHERE payment_status = 'paid' AND status = 'active' AND price IS NOT NULL), 0)::float AS "totalRevenue",
          COUNT(*) FILTER (WHERE payment_status = 'paid' AND status = 'active')::int AS "totalPaid"
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid
      `,
      this.prisma.read.$queryRaw<[{ activeUnits: number }]>`
        SELECT COUNT(*)::int AS "activeUnits"
        FROM venue.bookable_units
        WHERE tenant_id = ${tenantId}::uuid AND is_active = true
      `,
    ])

    const bookedHours30d = bookingRows[0]?.bookedHours30d ?? 0
    const activeUnits = unitRows[0]?.activeUnits ?? 0
    // 16 operational hours per day (06:00–22:00), 30 days
    const totalPossibleHours30d = activeUnits * 16 * 30
    const utilisationRate30d = totalPossibleHours30d > 0
      ? Math.round((bookedHours30d / totalPossibleHours30d) * 1000) / 10
      : 0

    return {
      totalBookedHours: bookingRows[0]?.totalBookedHours ?? 0,
      bookedHours30d,
      addOnRevenue: addOnRows[0]?.total ?? 0,
      totalRevenue: revenueRows[0]?.totalRevenue ?? 0,
      totalPaidBookings: revenueRows[0]?.totalPaid ?? 0,
      uniqueCustomers: customerRows[0]?.count ?? 0,
      utilisationRate30d,
    }
  }

  async getDailyStats(
    tenantId: string,
    days = 30,
  ): Promise<{ date: string; bookingCount: number; bookedHours: number; addOnRevenue: number; revenue: number }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [bookingRows, addOnRows] = await Promise.all([
      this.prisma.read.$queryRaw<{ date: string; bookingCount: number; bookedHours: number; revenue: number }[]>`
        SELECT
          starts_at::date::text                                                        AS date,
          COUNT(*)::int                                                                AS "bookingCount",
          COALESCE(SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600), 0)::float   AS "bookedHours",
          COALESCE(SUM(price) FILTER (WHERE payment_status = 'paid' AND price IS NOT NULL), 0)::float AS revenue
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid
          AND status    = 'active'
          AND starts_at >= ${cutoff}::timestamptz
        GROUP BY starts_at::date
        ORDER BY starts_at::date
      `,
      this.prisma.read.$queryRaw<{ date: string; addOnRevenue: number }[]>`
        SELECT
          b.starts_at::date::text                             AS date,
          COALESCE(SUM(ba.price * ba.quantity), 0)::float    AS "addOnRevenue"
        FROM booking.bookings b
        JOIN booking.booking_add_ons ba ON ba.booking_id = b.id AND ba.status = 'active'
        WHERE b.tenant_id = ${tenantId}::uuid
          AND b.status    = 'active'
          AND b.starts_at >= ${cutoff}::timestamptz
        GROUP BY b.starts_at::date
        ORDER BY b.starts_at::date
      `,
    ])

    const revenueByDate = new Map(addOnRows.map((r) => [r.date, r.addOnRevenue]))
    return bookingRows.map((r) => ({
      date: r.date,
      bookingCount: r.bookingCount,
      bookedHours: r.bookedHours,
      addOnRevenue: revenueByDate.get(r.date) ?? 0,
      revenue: r.revenue,
    }))
  }

  async approve(tenantId: string, id: string, approvedBy: string): Promise<BookingRow | null> {
    const rows = await this.prisma.write.$queryRaw<BookingRow[]>`
      UPDATE booking.bookings
      SET status      = 'active',
          approved_by = ${approvedBy},
          approved_at = now(),
          updated_at  = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ${id}::uuid
        AND status    = 'pending'
      RETURNING
        id, tenant_id AS "tenantId", status,
        approved_by AS "approvedBy", approved_at AS "approvedAt",
        updated_at  AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async reject(tenantId: string, id: string, reason?: string): Promise<BookingRow | null> {
    const rows = await this.prisma.write.$queryRaw<BookingRow[]>`
      UPDATE booking.bookings
      SET status       = 'cancelled',
          cancelled_at = now(),
          updated_at   = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ${id}::uuid
        AND status    = 'pending'
      RETURNING
        id, tenant_id AS "tenantId", status,
        cancelled_at AS "cancelledAt", updated_at AS "updatedAt"
    `
    if (rows[0] && reason) {
      await this.prisma.write.$queryRaw`
        UPDATE booking.bookings
        SET notes      = COALESCE(notes || chr(10), '') || ${'Rejected: ' + reason},
            updated_at = now()
        WHERE id = ${rows[0].id}::uuid
      `
    }
    return rows[0] ?? null
  }

  /**
   * Cancels all pending bookings whose created_at is older than `olderThanHours`.
   * Returns the number of bookings expired.
   */
  async expirePending(olderThanHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()
    const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
      UPDATE booking.bookings
      SET status       = 'cancelled',
          cancelled_at = now(),
          notes        = COALESCE(notes || chr(10), '') || 'Auto-cancelled: pending approval timed out',
          updated_at   = now()
      WHERE status     = 'pending'
        AND created_at < ${cutoff}::timestamptz
      RETURNING id
    `
    return rows.length
  }

  // ─── Reporting aggregations ─────────────────────────────────────────────────

  /** Breakdowns by status, booking source and payment status for the summary report. */
  async getStatsSummary(tenantId: string): Promise<{
    byStatus: { status: string; count: number }[]
    bySource: { source: string; count: number }[]
    byPaymentStatus: { paymentStatus: string; count: number }[]
  }> {
    const [byStatus, bySource, byPaymentStatus] = await Promise.all([
      this.prisma.read.$queryRaw<{ status: string; count: number }[]>`
        SELECT status, COUNT(*)::int AS count
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid
        GROUP BY status
        ORDER BY count DESC
      `,
      this.prisma.read.$queryRaw<{ source: string; count: number }[]>`
        SELECT COALESCE(booking_source, 'unknown') AS source, COUNT(*)::int AS count
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid
        GROUP BY booking_source
        ORDER BY count DESC
      `,
      this.prisma.read.$queryRaw<{ paymentStatus: string; count: number }[]>`
        SELECT payment_status AS "paymentStatus", COUNT(*)::int AS count
        FROM booking.bookings
        WHERE tenant_id = ${tenantId}::uuid AND status <> 'cancelled'
        GROUP BY payment_status
        ORDER BY count DESC
      `,
    ])
    return { byStatus, bySource, byPaymentStatus }
  }

  /** Booked hours and booking count per bookable unit (active bookings only). */
  async getStatsByUnit(tenantId: string): Promise<{
    bookableUnitId: string
    bookingCount: number
    bookedHours: number
  }[]> {
    return this.prisma.read.$queryRaw<{ bookableUnitId: string; bookingCount: number; bookedHours: number }[]>`
      SELECT
        bookable_unit_id                                                        AS "bookableUnitId",
        COUNT(*)::int                                                           AS "bookingCount",
        COALESCE(SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600), 0)::float AS "bookedHours"
      FROM booking.bookings
      WHERE tenant_id = ${tenantId}::uuid AND status = 'active'
      GROUP BY bookable_unit_id
      ORDER BY "bookedHours" DESC
    `
  }

  /** Booking counts by day-of-week (0=Sun) and hour-of-day, for a heatmap. */
  async getStatsByDow(tenantId: string): Promise<{ dow: number; hour: number; count: number }[]> {
    return this.prisma.read.$queryRaw<{ dow: number; hour: number; count: number }[]>`
      SELECT
        EXTRACT(DOW  FROM starts_at)::int  AS dow,
        EXTRACT(HOUR FROM starts_at)::int  AS hour,
        COUNT(*)::int                      AS count
      FROM booking.bookings
      WHERE tenant_id = ${tenantId}::uuid AND status = 'active'
      GROUP BY dow, hour
      ORDER BY dow, hour
    `
  }

  /** Top customers ranked by booking count, with total hours and add-on spend. */
  async getTopCustomers(tenantId: string, limit = 20): Promise<{
    customerId: string
    firstName: string | null
    lastName: string | null
    email: string | null
    bookingCount: number
    totalHours: number
    addOnSpend: number
  }[]> {
    return this.prisma.read.$queryRaw<{
      customerId: string
      firstName: string | null
      lastName: string | null
      email: string | null
      bookingCount: number
      totalHours: number
      addOnSpend: number
    }[]>`
      SELECT
        b.customer_id                                                                AS "customerId",
        c.first_name                                                                 AS "firstName",
        c.last_name                                                                  AS "lastName",
        c.email,
        COUNT(DISTINCT b.id)::int                                                    AS "bookingCount",
        COALESCE(SUM(EXTRACT(EPOCH FROM (b.ends_at - b.starts_at)) / 3600), 0)::float AS "totalHours",
        COALESCE(SUM(ba.price * ba.quantity), 0)::float                             AS "addOnSpend"
      FROM booking.bookings b
      JOIN people.persons c ON c.id = b.customer_id
      LEFT JOIN booking.booking_add_ons ba ON ba.booking_id = b.id AND ba.status = 'active'
      WHERE b.tenant_id    = ${tenantId}::uuid
        AND b.status       = 'active'
        AND b.customer_id IS NOT NULL
      GROUP BY b.customer_id, c.first_name, c.last_name, c.email
      ORDER BY "bookingCount" DESC
      LIMIT ${limit}
    `
  }

  // ─── Booking add-ons ────────────────────────────────────────────────────────

  async listAddOns(bookingId: string) {
    return this.prisma.read.bookingAddOn.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createAddOn(bookingId: string, dto: CreateBookingAddOnDto) {
    return this.prisma.write.bookingAddOn.create({
      data: {
        bookingId,
        addOnId: dto.addOnId,
        quantity: dto.quantity ?? 1,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'GBP',
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: dto.status ?? 'active',
      },
    })
  }
}
