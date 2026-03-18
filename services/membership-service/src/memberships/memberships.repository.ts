import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface ListInput {
  tenantId: string
  organisationId: string
  planId?: string | null
  status?: string | null
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
