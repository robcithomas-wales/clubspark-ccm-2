import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [
      totalOrgs,
      byPlan,
      byStatus,
      flagAdoption,
      recentAudit,
      activeImpersonations,
    ] = await Promise.all([
      this.prisma.organisation.count(),

      this.prisma.organisation.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),

      this.prisma.organisation.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      this.prisma.featureFlag.groupBy({
        by: ['flag'],
        where: { enabled: true },
        _count: { flag: true },
        orderBy: { _count: { flag: 'desc' } },
      }),

      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),

      this.prisma.impersonationSession.count({ where: { status: 'active' } }),
    ])

    return {
      totalOrgs,
      byPlan: Object.fromEntries(byPlan.map(r => [r.plan, r._count.plan])),
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count.status])),
      flagAdoption: flagAdoption.map(r => ({ flag: r.flag, count: r._count.flag })),
      recentAudit,
      activeImpersonations,
    }
  }
}
