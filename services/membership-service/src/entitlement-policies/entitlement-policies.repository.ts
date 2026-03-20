import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

interface ListInput {
  tenantId: string
  organisationId: string
  limit: number
  offset: number
}

interface CreateInput {
  tenantId: string
  organisationId: string
  name: string
  policyType?: string | null
  description?: string | null
  status?: string
}

interface EntitlementItem {
  entitlementPolicyId: string
  scopeType?: string | null
  scopeId?: string | null
  configuration?: Record<string, unknown>
  priority?: number
}

@Injectable()
export class EntitlementPoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where = {
      tenantId: input.tenantId,
      organisationId: input.organisationId,
    }

    const [rows, total] = await Promise.all([
      this.prisma.entitlementPolicy.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: input.offset,
        take: input.limit,
      }),
      this.prisma.entitlementPolicy.count({ where }),
    ])

    return { rows, total }
  }

  async findById(tenantId: string, organisationId: string, id: string) {
    return this.prisma.entitlementPolicy.findFirst({
      where: { id, tenantId, organisationId },
    })
  }

  async create(input: CreateInput) {
    return this.prisma.entitlementPolicy.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        name: input.name,
        policyType: input.policyType ?? null,
        description: input.description ?? null,
        status: input.status ?? 'active',
      },
    })
  }

  async update(id: string, input: Partial<Omit<CreateInput, 'tenantId' | 'organisationId'>>) {
    return this.prisma.entitlementPolicy.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.policyType !== undefined ? { policyType: input.policyType } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    })
  }

  async listByPlanId(tenantId: string, organisationId: string, planId: string) {
    return this.prisma.membershipPlanEntitlement.findMany({
      where: {
        tenantId,
        planId,
        entitlementPolicy: { organisationId },
      },
      include: {
        entitlementPolicy: {
          select: { name: true, policyType: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { entitlementPolicy: { name: 'asc' } }],
    })
  }

  async replaceForPlan(
    tenantId: string,
    planId: string,
    entitlements: EntitlementItem[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.membershipPlanEntitlement.deleteMany({
        where: { tenantId, planId },
      })

      for (const e of entitlements) {
        await tx.membershipPlanEntitlement.create({
          data: {
            tenantId,
            planId,
            entitlementPolicyId: e.entitlementPolicyId,
            scopeType: e.scopeType ?? null,
            scopeId: e.scopeId ?? null,
            configuration: (e.configuration ?? {}) as any,
            priority: e.priority ?? 100,
          },
        })
      }
    })
  }
}
