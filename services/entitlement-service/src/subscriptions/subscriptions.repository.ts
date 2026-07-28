import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AssignPlanDto } from './dto/assign-plan.dto.js'
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto.js'

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organisationId: string, tenantId: string) {
    return this.prisma.orgSubscription.findFirst({
      where: { organisationId, tenantId },
      include: {
        plan: {
          include: {
            planFeatures: { include: { feature: true } },
          },
        },
      },
    })
  }

  async listByTenant(tenantId: string) {
    return this.prisma.orgSubscription.findMany({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async upsert(tenantId: string, dto: AssignPlanDto) {
    // organisationId is globally unique, so an upsert keyed on it alone could
    // hit another tenant's row. Reject if the org already belongs elsewhere.
    const existing = await this.prisma.orgSubscription.findUnique({
      where: { organisationId: dto.organisationId },
      select: { tenantId: true },
    })
    if (existing && existing.tenantId !== tenantId) {
      throw new ForbiddenException(`Organisation '${dto.organisationId}' does not belong to this tenant`)
    }
    return this.prisma.orgSubscription.upsert({
      where: { organisationId: dto.organisationId },
      create: {
        organisationId: dto.organisationId,
        tenantId,
        planId: dto.planId,
        billingCycle: dto.billingCycle ?? 'monthly',
        status: dto.status ?? 'active',
      },
      update: {
        planId: dto.planId,
        billingCycle: dto.billingCycle ?? 'monthly',
        status: dto.status ?? 'active',
      },
      include: { plan: true },
    })
  }

  async update(organisationId: string, tenantId: string, dto: UpdateSubscriptionDto) {
    return this.prisma.orgSubscription.updateMany({
      where: { organisationId, tenantId },
      data: {
        ...(dto.planId !== undefined ? { planId: dto.planId } : {}),
        ...(dto.billingCycle !== undefined ? { billingCycle: dto.billingCycle } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    })
  }
}
