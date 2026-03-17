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
  seriesId: string | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
  customerFirstName: string | null
  customerLastName: string | null
  customerEmail: string | null
  customerPhone: string | null
}

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    page: number,
    limit: number,
    filters: { status?: string; fromDate?: string; toDate?: string } = {},
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
          b.series_id          AS "seriesId",
          b.cancelled_at       AS "cancelledAt",
          b.created_at         AS "createdAt",
          b.updated_at         AS "updatedAt",
          c.first_name         AS "customerFirstName",
          c.last_name          AS "customerLastName",
          c.email              AS "customerEmail",
          c.phone              AS "customerPhone",
          COUNT(*) OVER()::int AS "totalCount"
        FROM booking.bookings b
        LEFT JOIN customer.customers c ON c.id = b.customer_id
        WHERE b.tenant_id = ${tenantId}::uuid
        ${statusFilter}
        ${fromFilter}
        ${toFilter}
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

          const rows = await tx.$queryRaw<BookingRow[]>`
            INSERT INTO booking.bookings (
              tenant_id, organisation_id, venue_id, resource_id,
              bookable_unit_id, customer_id, booking_source,
              starts_at, ends_at, status, payment_status, booking_reference, notes
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
              'active',
              ${dto.paymentStatus ?? 'unpaid'},
              ${bookingReference},
              ${dto.notes ?? null}
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
              cancelled_at     AS "cancelledAt",
              created_at       AS "createdAt",
              updated_at       AS "updatedAt"
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

  async update(tenantId: string, id: string, dto: UpdateBookingDto): Promise<BookingRow | null> {
    const rows = await this.prisma.write.$queryRaw<BookingRow[]>`
      UPDATE booking.bookings
      SET
        starts_at      = COALESCE(${dto.startsAt ?? null}::timestamptz,   starts_at),
        ends_at        = COALESCE(${dto.endsAt ?? null}::timestamptz,     ends_at),
        notes          = CASE WHEN ${dto.notes !== undefined} THEN ${dto.notes ?? null}      ELSE notes          END,
        booking_source = CASE WHEN ${dto.bookingSource !== undefined} THEN ${dto.bookingSource ?? null} ELSE booking_source END,
        customer_id    = CASE WHEN ${dto.customerId !== undefined} THEN ${dto.customerId ?? null}::uuid ELSE customer_id END,
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
        series_id        AS "seriesId",
        cancelled_at     AS "cancelledAt",
        created_at       AS "createdAt",
        updated_at       AS "updatedAt"
    `
    return rows[0] ?? null
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
