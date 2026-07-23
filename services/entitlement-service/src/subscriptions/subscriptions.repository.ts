import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AssignPlanDto } from './dto/assign-plan.dto.js'
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto.js'

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organisationId: string) {
    return this.prisma.orgSubscription.findUnique({
      where: { organisationId },
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
