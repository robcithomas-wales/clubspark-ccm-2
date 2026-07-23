import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AccountingSyncStatus } from '../generated/prisma/index.js'

@Injectable()
export class AccountingSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertLog(data: {
    connectionId: string
    tenantId: string
    eventType: string
    sourceId: string
    sourceType: string
  }) {
    return this.prisma.write.accountingSyncLog.upsert({
      where: {
        connectionId_sourceId_eventType: {
          connectionId: data.connectionId,
          sourceId: data.sourceId,
          eventType: data.eventType,
        },
      },
      create: { ...data, status: 'pending', attempts: 0 },
      update: { status: 'pending', attempts: 0, errorMessage: null, nextRetryAt: null },
    })
  }

  async markSynced(id: string, providerRef: string) {
    return this.prisma.write.accountingSyncLog.update({
      where: { id },
      data: { status: 'synced', providerRef, syncedAt: new Date(), errorMessage: null },
    })
  }

  async markFailed(id: string, error: string, attempts: number, nextRetryAt: Date | null) {
    const status: AccountingSyncStatus = attempts >= 5 ? 'dead' : 'failed'
    return this.prisma.write.accountingSyncLog.update({
      where: { id },
      data: { status, attempts, errorMessage: error, nextRetryAt },
    })
  }

  async findPendingForRetry(limit = 50) {
    return this.prisma.write.accountingSyncLog.findMany({
      where: {
        status: { in: ['pending', 'failed'] },
        nextRetryAt: { lte: new Date() },
        attempts: { lt: 5 },
      },
      include: { connection: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async listByTenant(tenantId: string, page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.read.accountingSyncLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.read.accountingSyncLog.count({ where: { tenantId } }),
    ])
    return { data, total }
  }
}
