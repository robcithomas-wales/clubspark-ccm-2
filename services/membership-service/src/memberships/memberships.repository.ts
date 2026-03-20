import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Calculate an end date from a start date based on durationType / billingInterval.
 * Returns null for open-ended / unknown duration types.
 */
function computeEndDate(
  start: Date,
  durationType?: string | null,
  billingInterval?: string | null,
): Date | null {
  const d = new Date(start)
  const type = durationType?.toLowerCase()
  const interval = billingInterval?.toLowerCase()

  if (type === 'annual' || type === 'yearly' || interval === 'annual') {
    d.setFullYear(d.getFullYear() + 1)
    d.setDate(d.getDate() - 1)
    return d
  }
  if (type === 'monthly' || interval === 'monthly') {
    d.setMonth(d.getMonth() + 1)
    d.setDate(d.getDate() - 1)
    return d
  }
  if (type === 'quarterly' || interval === 'quarterly') {
    d.setMonth(d.getMonth() + 3)
    d.setDate(d.getDate() - 1)
    return d
  }
  return null
}

interface ListInput {
  tenantId: string
  organisationId: string
  planId?: string | null
  status?: string | null
  paymentStatus?: string | null
  renewingWithinDays?: number | null
  customerId?: string | null
  ownerType?: string | null
  ownerId?: string | null
  search?: string | null
  limit: number
  offset: number
}

interface WriteInput {
  tenantId: string
  organisationId: string
  planId: string
  customerId?: string | null
  ownerType?: string | null
  ownerId?: string | null
  status: string
  startDate: string
  endDate?: string | null
  renewalDate?: string | null
  autoRenew: boolean
  paymentStatus?: string | null
  reference?: string | null
  source?: string | null
  notes?: string | null
}

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where: any = {
      tenantId: input.tenantId,
      organisationId: input.organisationId,
    }
    if (input.planId) where.planId = input.planId
    if (input.status) where.status = input.status
    if (input.paymentStatus) where.paymentStatus = input.paymentStatus
    if (input.renewingWithinDays != null) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + input.renewingWithinDays)
      where.renewalDate = { lte: cutoff }
      where.status = { in: ['active', 'pending'] }
    }
    if (input.customerId) where.customerId = input.customerId
    if (input.ownerType) where.ownerType = input.ownerType
    if (input.ownerId) where.ownerId = input.ownerId
    if (input.search) {
      where.OR = [
        { plan: { name: { contains: input.search, mode: 'insensitive' } } },
        { reference: { contains: input.search, mode: 'insensitive' } },
        { source: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
        orderBy: { createdAt: 'desc' },
        skip: input.offset,
        take: input.limit,
      }),
      this.prisma.membership.count({ where }),
    ])

    return { rows: rows.map((m) => this.format(m)), total }
  }

  async findById(tenantId: string, organisationId: string, id: string) {
    const m = await this.prisma.membership.findFirst({
      where: { id, tenantId, organisationId },
      include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
    })
    return m ? this.format(m) : null
  }

  async create(input: WriteInput) {
    const m = await this.prisma.membership.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        planId: input.planId,
        customerId: input.customerId ?? null,
        ownerType: input.ownerType ?? null,
        ownerId: input.ownerId ?? null,
        status: input.status,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
        autoRenew: input.autoRenew,
        paymentStatus: input.paymentStatus ?? null,
        reference: input.reference ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
      include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
    })
    return this.format(m)
  }

  async update(id: string, input: Omit<WriteInput, 'tenantId' | 'organisationId'>) {
    const m = await this.prisma.membership.update({
      where: { id },
      data: {
        planId: input.planId,
        customerId: input.customerId ?? null,
        ownerType: input.ownerType ?? null,
        ownerId: input.ownerId ?? null,
        status: input.status,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : null,
        autoRenew: input.autoRenew,
        paymentStatus: input.paymentStatus ?? null,
        reference: input.reference ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
      include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
    })
    return this.format(m)
  }

  async transition(
    id: string,
    toStatus: string,
    timestamps: { activatedAt?: Date; suspendedAt?: Date; cancelledAt?: Date; lapsedAt?: Date; expiredAt?: Date },
    fromStatus: string,
    reason: string | null,
    createdBy: string | null,
  ) {
    const [m] = await this.prisma.$transaction([
      this.prisma.membership.update({
        where: { id },
        data: { status: toStatus, ...timestamps },
        include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
      }),
      this.prisma.membershipLifecycleEvent.create({
        data: { membershipId: id, fromStatus, toStatus, reason, createdBy },
      }),
    ])
    return this.format(m)
  }

  async listHistory(membershipId: string) {
    return this.prisma.membershipLifecycleEvent.findMany({
      where: { membershipId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async delete(id: string) {
    await this.prisma.membership.delete({ where: { id } })
  }

  async listExpiringRenewals(tenantId: string, organisationId: string, withinDays: number) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + withinDays)

    const rows = await this.prisma.membership.findMany({
      where: {
        tenantId,
        organisationId,
        status: { in: ['active', 'pending'] },
        renewalDate: { lte: cutoff },
      },
      include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
      orderBy: { renewalDate: 'asc' },
      take: 100,
    })
    return rows.map((m) => this.format(m))
  }

  async recordPayment(id: string, input: {
    paymentStatus: string
    paymentMethod: string | null
    paymentReference: string | null
    paymentAmount: number | null
    paymentRecordedAt: Date
  }) {
    const m = await this.prisma.membership.update({
      where: { id },
      data: {
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        paymentAmount: input.paymentAmount,
        paymentRecordedAt: input.paymentRecordedAt,
      },
      include: { plan: { select: { name: true, ownershipType: true, membershipType: true, price: true, currency: true, pricingModel: true } } },
    })
    return this.format(m)
  }

  // ─── Reporting aggregations ─────────────────────────────────────────────────

  async getStats(tenantId: string, organisationId: string): Promise<{
    byStatus: { status: string; count: number }[]
    byPlan: { planName: string; membershipType: string; count: number; revenue: number }[]
    byType: { membershipType: string; count: number }[]
    totalActive: number
    totalRevenue: number
  }> {
    const [byStatus, byPlan] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; count: number }[]>`
        SELECT status, COUNT(*)::int AS count
        FROM membership.memberships
        WHERE tenant_id = ${tenantId}::uuid AND organisation_id = ${organisationId}::uuid
        GROUP BY status
        ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ planName: string; membershipType: string; count: number; revenue: number }[]>`
        SELECT
          p.name                                                             AS "planName",
          p.membership_type                                                  AS "membershipType",
          COUNT(m.id)::int                                                   AS count,
          COALESCE(SUM(CASE WHEN m.status = 'active' THEN p.price::float ELSE 0 END), 0) AS revenue
        FROM membership.memberships m
        JOIN membership.membership_plans p ON p.id = m.plan_id
        WHERE m.tenant_id = ${tenantId}::uuid AND m.organisation_id = ${organisationId}::uuid
        GROUP BY p.id, p.name, p.membership_type
        ORDER BY count DESC
      `,
    ])

    const byTypeMap = new Map<string, number>()
    let totalActive = 0
    let totalRevenue = 0
    for (const row of byPlan) {
      byTypeMap.set(row.membershipType, (byTypeMap.get(row.membershipType) ?? 0) + row.count)
      totalRevenue += row.revenue
    }
    for (const row of byStatus) {
      if (row.status === 'active') totalActive = row.count
    }

    const byType = Array.from(byTypeMap.entries()).map(([membershipType, count]) => ({ membershipType, count }))
    return { byStatus, byPlan, byType, totalActive, totalRevenue }
  }

  async getDailyStats(tenantId: string, organisationId: string, months = 12): Promise<{
    month: string
    newCount: number
    activeCount: number
  }[]> {
    return this.prisma.$queryRaw<{ month: string; newCount: number; activeCount: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int                                        AS "newCount",
        COUNT(*) FILTER (WHERE status = 'active')::int       AS "activeCount"
      FROM membership.memberships
      WHERE tenant_id      = ${tenantId}::uuid
        AND organisation_id = ${organisationId}::uuid
        AND created_at     >= DATE_TRUNC('month', CURRENT_TIMESTAMP) - (${months - 1} || ' months')::interval
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `
  }

  // ─── Cron helpers ────────────────────────────────────────────────────────────

  /**
   * Lapse all active/suspended memberships whose endDate has passed.
   * Returns the number of memberships transitioned.
   */
  async lapseExpired(now: Date): Promise<number> {
    const candidates = await this.prisma.membership.findMany({
      where: {
        status: { in: ['active', 'suspended'] },
        endDate: { lt: now },
      },
      select: { id: true, status: true },
    })

    if (candidates.length === 0) return 0

    await this.prisma.$transaction([
      this.prisma.membership.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { status: 'lapsed', lapsedAt: now },
      }),
      ...candidates.map((c) =>
        this.prisma.membershipLifecycleEvent.create({
          data: {
            membershipId: c.id,
            fromStatus: c.status,
            toStatus: 'lapsed',
            reason: 'Auto-lapsed: membership end date reached',
            createdBy: 'system',
          },
        }),
      ),
    ])

    return candidates.length
  }

  /**
   * Expire all lapsed memberships that have also passed the plan's grace period.
   * Returns the number of memberships transitioned.
   */
  async expireLapsed(now: Date): Promise<number> {
    const candidates = await this.prisma.membership.findMany({
      where: { status: 'lapsed', endDate: { not: null } },
      select: {
        id: true,
        endDate: true,
        plan: { select: { gracePeriodDays: true } },
      },
    })

    const toExpire = candidates.filter((c) => {
      const grace = c.plan?.gracePeriodDays ?? 0
      const expireAfter = new Date(c.endDate!)
      expireAfter.setDate(expireAfter.getDate() + grace)
      return expireAfter <= now
    })

    if (toExpire.length === 0) return 0

    await this.prisma.$transaction([
      this.prisma.membership.updateMany({
        where: { id: { in: toExpire.map((c) => c.id) } },
        data: { status: 'expired', expiredAt: now },
      }),
      ...toExpire.map((c) =>
        this.prisma.membershipLifecycleEvent.create({
          data: {
            membershipId: c.id,
            fromStatus: 'lapsed',
            toStatus: 'expired',
            reason: 'Auto-expired: grace period elapsed',
            createdBy: 'system',
          },
        }),
      ),
    ])

    return toExpire.length
  }

  /**
   * Find active memberships with autoRenew=true whose endDate is within
   * the next `withinDays` days and for which no future membership already
   * exists for the same plan + customer. Returns the created count.
   */
  async createAutoRenewals(now: Date, withinDays: number): Promise<number> {
    const horizon = new Date(now)
    horizon.setDate(horizon.getDate() + withinDays)

    const candidates = await this.prisma.membership.findMany({
      where: {
        autoRenew: true,
        status: 'active',
        endDate: { gte: now, lte: horizon },
      },
      select: {
        id: true,
        tenantId: true,
        organisationId: true,
        planId: true,
        customerId: true,
        ownerType: true,
        ownerId: true,
        endDate: true,
        plan: { select: { durationType: true, billingInterval: true } },
      },
    })

    let created = 0
    for (const m of candidates) {
      // Skip if a future membership already exists for this plan+customer
      const existing = await this.prisma.membership.findFirst({
        where: {
          tenantId: m.tenantId,
          planId: m.planId,
          customerId: m.customerId,
          startDate: { gt: m.endDate! },
          status: { notIn: ['cancelled', 'expired'] },
        },
      })
      if (existing) continue

      const newStart = new Date(m.endDate!)
      newStart.setDate(newStart.getDate() + 1)
      const newEnd = computeEndDate(newStart, m.plan?.durationType, m.plan?.billingInterval)

      await this.prisma.membership.create({
        data: {
          tenantId: m.tenantId,
          organisationId: m.organisationId,
          planId: m.planId,
          customerId: m.customerId,
          ownerType: m.ownerType,
          ownerId: m.ownerId,
          status: 'pending',
          startDate: newStart,
          endDate: newEnd,
          renewalDate: newEnd,
          autoRenew: true,
          paymentStatus: 'unpaid',
          source: 'auto-renew',
          notes: `Auto-renewal queued from membership ${m.id}`,
        },
      })
      await this.prisma.membershipLifecycleEvent.create({
        data: {
          membershipId: m.id,
          fromStatus: 'active',
          toStatus: 'active',
          reason: `Auto-renewal queued: new membership created from ${newStart.toISOString().slice(0, 10)}`,
          createdBy: 'system',
        },
      })
      created++
    }

    return created
  }

  private format(m: any) {
    const { plan, ...rest } = m
    return {
      ...rest,
      planName: plan?.name ?? null,
      ownershipType: plan?.ownershipType ?? null,
      membershipType: plan?.membershipType ?? null,
      price: plan?.price != null ? Number(plan.price) : null,
      currency: plan?.currency ?? null,
      pricingModel: plan?.pricingModel ?? null,
      householdId: rest.ownerType === 'household' ? rest.ownerId : null,
    }
  }
}
