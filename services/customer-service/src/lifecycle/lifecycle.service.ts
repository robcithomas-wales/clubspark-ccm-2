import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TransitionLifecycleDto } from './dto/transition-lifecycle.dto.js'

@Injectable()
export class LifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(tenantId: string, customerId: string, dto: TransitionLifecycleDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true, lifecycleState: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')

    const fromState = customer.lifecycleState

    await this.prisma.$transaction([
      this.prisma.customer.updateMany({
        where: { tenantId, id: customerId },
        data: {
          lifecycleState: dto.toState,
          lifecycleChangedAt: new Date(),
        },
      }),
      this.prisma.lifecycleHistory.create({
        data: {
          customerId,
          tenantId,
          fromState,
          toState: dto.toState,
          reason: dto.reason ?? null,
          changedBy: dto.changedBy ?? 'admin',
        },
      }),
    ])

    const updated = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
    })
    return { data: updated }
  }

  async getHistory(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true },
    })
    if (!customer) throw new NotFoundException('Customer not found')

    const history = await this.prisma.lifecycleHistory.findMany({
      where: { tenantId, customerId },
      orderBy: { changedAt: 'desc' },
    })
    return { data: history }
  }
}
