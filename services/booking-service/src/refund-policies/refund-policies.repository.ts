import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface RefundPolicyRow {
  id: string
  tenantId: string
  name: string
  venueId: string | null
  hoursBeforeStart: number
  refundPct: number
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateRefundPolicyDto {
  name: string
  venueId?: string | null
  hoursBeforeStart: number
  refundPct: number
  priority?: number
}

export interface UpdateRefundPolicyDto {
  name?: string
  venueId?: string | null
  hoursBeforeStart?: number
  refundPct?: number
  priority?: number
  isActive?: boolean
}

@Injectable()
export class RefundPoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<RefundPolicyRow[]> {
    return this.prisma.read.$queryRaw<RefundPolicyRow[]>`
      SELECT
        id,
        tenant_id          AS "tenantId",
        name,
        venue_id           AS "venueId",
        hours_before_start AS "hoursBeforeStart",
        refund_pct         AS "refundPct",
        priority,
        is_active          AS "isActive",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
      FROM booking.refund_policies
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY priority ASC, hours_before_start DESC
    `
  }

  async findById(tenantId: string, id: string): Promise<RefundPolicyRow | null> {
    const rows = await this.prisma.read.$queryRaw<RefundPolicyRow[]>`
      SELECT
        id,
        tenant_id          AS "tenantId",
        name,
        venue_id           AS "venueId",
        hours_before_start AS "hoursBeforeStart",
        refund_pct         AS "refundPct",
        priority,
        is_active          AS "isActive",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
      FROM booking.refund_policies
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
    `
    return rows[0] ?? null
  }

  async create(tenantId: string, dto: CreateRefundPolicyDto): Promise<RefundPolicyRow> {
    const rows = await this.prisma.write.$queryRaw<RefundPolicyRow[]>`
      INSERT INTO booking.refund_policies (
        tenant_id, name, venue_id, hours_before_start, refund_pct, priority
      ) VALUES (
        ${tenantId}::uuid,
        ${dto.name},
        ${dto.venueId ?? null}::uuid,
        ${dto.hoursBeforeStart},
        ${dto.refundPct},
        ${dto.priority ?? 100}
      )
      RETURNING
        id,
        tenant_id          AS "tenantId",
        name,
        venue_id           AS "venueId",
        hours_before_start AS "hoursBeforeStart",
        refund_pct         AS "refundPct",
        priority,
        is_active          AS "isActive",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
    `
    return rows[0]!
  }

  async update(tenantId: string, id: string, dto: UpdateRefundPolicyDto): Promise<RefundPolicyRow | null> {
    const rows = await this.prisma.write.$queryRaw<RefundPolicyRow[]>`
      UPDATE booking.refund_policies
      SET
        name               = COALESCE(${dto.name ?? null}, name),
        venue_id           = CASE WHEN ${dto.venueId !== undefined} THEN ${dto.venueId ?? null}::uuid ELSE venue_id END,
        hours_before_start = COALESCE(${dto.hoursBeforeStart ?? null}, hours_before_start),
        refund_pct         = COALESCE(${dto.refundPct ?? null}, refund_pct),
        priority           = COALESCE(${dto.priority ?? null}, priority),
        is_active          = COALESCE(${dto.isActive ?? null}, is_active),
        updated_at         = now()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      RETURNING
        id,
        tenant_id          AS "tenantId",
        name,
        venue_id           AS "venueId",
        hours_before_start AS "hoursBeforeStart",
        refund_pct         AS "refundPct",
        priority,
        is_active          AS "isActive",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.prisma.write.$queryRaw<{ id: string }[]>`
      DELETE FROM booking.refund_policies
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      RETURNING id
    `
    return rows.length > 0
  }

  /**
   * Find the best-matching active refund policy for a booking at the time of cancellation.
   * Prefers venue-specific policies over global ones. Lower priority number wins.
   */
  async findApplicablePolicy(
    tenantId: string,
    venueId: string,
    hoursUntilStart: number,
  ): Promise<RefundPolicyRow | null> {
    const rows = await this.prisma.read.$queryRaw<RefundPolicyRow[]>`
      SELECT
        id,
        tenant_id          AS "tenantId",
        name,
        venue_id           AS "venueId",
        hours_before_start AS "hoursBeforeStart",
        refund_pct         AS "refundPct",
        priority,
        is_active          AS "isActive",
        created_at         AS "createdAt",
        updated_at         AS "updatedAt"
      FROM booking.refund_policies
      WHERE tenant_id = ${tenantId}::uuid
        AND is_active = TRUE
        AND hours_before_start <= ${hoursUntilStart}
        AND (venue_id IS NULL OR venue_id = ${venueId}::uuid)
      ORDER BY
        CASE WHEN venue_id IS NOT NULL THEN 0 ELSE 1 END ASC, -- venue-specific first
        priority ASC,
        hours_before_start DESC  -- most restrictive (highest hours) wins
      LIMIT 1
    `
    return rows[0] ?? null
  }

  async applyRefundToBooking(
    tenantId: string,
    bookingId: string,
    refundPct: number,
    refundAmount: number | null,
  ): Promise<void> {
    await this.prisma.write.$queryRaw`
      UPDATE booking.bookings
      SET
        refund_pct    = ${refundPct},
        refund_amount = ${refundAmount},
        refund_status = 'pending',
        updated_at    = now()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${bookingId}::uuid
    `
  }
}
