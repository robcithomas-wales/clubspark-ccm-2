import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface ListInput {
  tenantId: string
  organisationId: string
  schemeId?: string | null
  status?: string | null
  search?: string | null
  limit: number
  offset: number
}

interface CreateInput {
  tenantId: string
  organisationId: string
  schemeId: string
  name: string
  code?: string | null
  description?: string | null
  ownershipType: string
  durationType: string
  visibility?: string | null
  status?: string
  sortOrder?: number | null
  membershipType?: string | null
  sportCategory?: string | null
  maxMembers?: number | null
  isPublic?: boolean
  pricingModel?: string | null
  price?: number | null
  currency?: string
  billingInterval?: string | null
  instalmentCount?: number | null
  eligibility?: Record<string, unknown> | null
  gracePeriodDays?: number | null
  termsAndConditions?: string | null
}

interface UpdateInput extends Partial<Omit<CreateInput, 'tenantId' | 'organisationId'>> {
  tenantId: string
  organisationId: string
  id: string
}

@Injectable()
export class MembershipPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where: any = {
      tenantId: input.tenantId,
      organisationId: input.organisationId,
    }
    if (input.schemeId) where.schemeId = input.schemeId
    if (input.status) where.status = input.status
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { code: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.membershipPlan.findMany({
        where,
        include: { scheme: { select: { name: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: input.offset,
        take: input.limit,
      }),
      this.prisma.membershipPlan.count({ where }),
    ])

    return { rows: rows.map((p) => this.format(p)), total }
  }

  async findById(tenantId: string, organisationId: string | null, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id, tenantId, ...(organisationId ? { organisationId } : {}) },
      include: { scheme: { select: { name: true } } },
    })
    return plan ? this.format(plan) : null
  }

  async create(input: CreateInput) {
    const plan = await this.prisma.membershipPlan.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        schemeId: input.schemeId,
        name: input.name,
        code: input.code ?? null,
        description: input.description ?? null,
        // These are NOT NULL in the database. schema.prisma previously declared
        // them nullable, so `?? null` typechecked while being a guaranteed
        // runtime failure whenever the caller omitted one. Introspection
        // corrected the types and surfaced it.
        //
        // visibility and sortOrder have database defaults, so they are omitted
        // when absent; ownershipType and durationType have none and are required.
        ownershipType: input.ownershipType,
        durationType: input.durationType,
        ...(input.visibility != null ? { visibility: input.visibility } : {}),
        status: input.status ?? 'active',
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
        membershipType: input.membershipType ?? null,
        sportCategory: input.sportCategory ?? null,
        maxMembers: input.maxMembers ?? null,
        isPublic: input.isPublic ?? false,
        pricingModel: input.pricingModel ?? null,
        price: input.price != null ? input.price : null,
        currency: input.currency ?? 'GBP',
        billingInterval: input.billingInterval ?? null,
        instalmentCount: input.instalmentCount ?? null,
        eligibility: (input.eligibility ?? undefined) as any,
        gracePeriodDays: input.gracePeriodDays ?? null,
        termsAndConditions: input.termsAndConditions ?? null,
      },
      include: { scheme: { select: { name: true } } },
    })
    return this.format(plan)
  }

  async setEligibility(
    tenantId: string,
    organisationId: string,
    id: string,
    eligibility: Record<string, unknown>,
  ) {
    const existing = await this.prisma.membershipPlan.findFirst({
      where: { id, tenantId, organisationId },
    })
    if (!existing) return null

    const plan = await this.prisma.membershipPlan.update({
      where: { id },
      data: { eligibility: eligibility as any },
      include: { scheme: { select: { name: true } } },
    })
    return this.format(plan)
  }

  async update(input: UpdateInput) {
    const existing = await this.prisma.membershipPlan.findFirst({
      where: { id: input.id, tenantId: input.tenantId, organisationId: input.organisationId },
    })
    if (!existing) return null

    const plan = await this.prisma.membershipPlan.update({
      where: { id: input.id },
      data: {
        schemeId: input.schemeId ?? existing.schemeId,
        name: input.name ?? existing.name,
        code: input.code !== undefined ? input.code : existing.code,
        description: input.description !== undefined ? input.description : existing.description,
        ownershipType: input.ownershipType ?? existing.ownershipType,
        durationType: input.durationType ?? existing.durationType,
        // NOT NULL columns: `null` from the caller means "leave unchanged",
        // never "write null" — which the old nullable typings allowed.
        visibility: input.visibility ?? existing.visibility,
        status: input.status ?? existing.status,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        membershipType:
          input.membershipType !== undefined ? input.membershipType : existing.membershipType,
        sportCategory:
          input.sportCategory !== undefined ? input.sportCategory : existing.sportCategory,
        maxMembers: input.maxMembers !== undefined ? input.maxMembers : existing.maxMembers,
        isPublic: input.isPublic !== undefined ? input.isPublic : existing.isPublic,
        pricingModel: input.pricingModel !== undefined ? input.pricingModel : existing.pricingModel,
        price: input.price !== undefined ? input.price : existing.price,
        currency: input.currency ?? existing.currency,
        billingInterval:
          input.billingInterval !== undefined ? input.billingInterval : existing.billingInterval,
        instalmentCount:
          input.instalmentCount !== undefined ? input.instalmentCount : existing.instalmentCount,
        eligibility: (input.eligibility !== undefined
          ? input.eligibility
          : existing.eligibility) as any,
        gracePeriodDays:
          input.gracePeriodDays !== undefined ? input.gracePeriodDays : existing.gracePeriodDays,
        termsAndConditions:
          input.termsAndConditions !== undefined
            ? input.termsAndConditions
            : existing.termsAndConditions,
      },
      include: { scheme: { select: { name: true } } },
    })
    return this.format(plan)
  }

  private format(plan: any) {
    const { scheme, ...rest } = plan
    return {
      ...rest,
      price: rest.price != null ? Number(rest.price) : null,
      schemeName: scheme?.name ?? null,
    }
  }
}
