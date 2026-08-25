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
      // A duplicate domain event must not reset a synced/dead/failed row and
      // create a second provider invoice. Retries are owned by the sync worker.
      update: {},
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

  async claimPendingForRetry(limit = 50, leaseSeconds = 300) {
    return this.prisma.write.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<{ id: string }[]>`
        WITH candidates AS (
          SELECT id
          FROM integration.accounting_sync_log
          WHERE status IN ('pending', 'failed')
            AND COALESCE(next_retry_at, created_at) <= now()
            AND attempts < 5
          ORDER BY created_at
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE integration.accounting_sync_log sync_log
        SET next_retry_at = now() + make_interval(secs => ${leaseSeconds}),
            updated_at = now()
        FROM candidates
        WHERE sync_log.id = candidates.id
        RETURNING sync_log.id::text
      `
      if (claimed.length === 0) return []

      return tx.accountingSyncLog.findMany({
        where: { id: { in: claimed.map(({ id }) => id) } },
        include: { connection: true },
        orderBy: { createdAt: 'asc' },
      })
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
