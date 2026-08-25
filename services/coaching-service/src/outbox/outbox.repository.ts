import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CoachingOccupancyEvent } from '../event-bus/event-bus.service.js'

export const MAX_ATTEMPTS = 10
export interface PendingEvent {
  id: string
  payload: CoachingOccupancyEvent
  attempts: number
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(tx: Prisma.TransactionClient, event: CoachingOccupancyEvent): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO coaching.event_outbox (tenant_id, event_type, payload)
      VALUES (${event.tenantId}::uuid, ${event.type}, ${JSON.stringify(event)}::jsonb)
    `
  }

  claimBatch(tx: Prisma.TransactionClient, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      SELECT id::text, payload, attempts FROM coaching.event_outbox
      WHERE published_at IS NULL AND attempts < ${MAX_ATTEMPTS} AND next_attempt_at <= now()
      ORDER BY created_at LIMIT ${limit} FOR UPDATE SKIP LOCKED
    `
  }

  async markPublished(tx: Prisma.TransactionClient, id: string) {
    await tx.$executeRaw`UPDATE coaching.event_outbox SET published_at = now(), last_error = NULL WHERE id = ${id}::uuid`
  }

  async markFailed(tx: Prisma.TransactionClient, id: string, attempts: number, error: string) {
    const delaySeconds = Math.min(2 ** attempts, 3600)
    await tx.$executeRaw`
      UPDATE coaching.event_outbox SET attempts = attempts + 1,
        last_error = ${error.slice(0, 1000)},
        next_attempt_at = now() + make_interval(secs => ${delaySeconds})
      WHERE id = ${id}::uuid
    `
  }

  async countDeadLettered(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM coaching.event_outbox
      WHERE published_at IS NULL AND attempts >= ${MAX_ATTEMPTS}
    `
    return rows[0]?.count ?? 0
  }

  async operationalStatus(tenantId: string) {
    const [row] = await this.prisma.$queryRaw<
      { pending: number; deadLettered: number; oldestPendingAt: Date | null }[]
    >`
      SELECT
        count(*) FILTER (WHERE attempts < ${MAX_ATTEMPTS})::int AS pending,
        count(*) FILTER (WHERE attempts >= ${MAX_ATTEMPTS})::int AS "deadLettered",
        min(created_at) FILTER (WHERE attempts < ${MAX_ATTEMPTS}) AS "oldestPendingAt"
      FROM coaching.event_outbox
      WHERE tenant_id = ${tenantId}::uuid AND published_at IS NULL
    `
    return row ?? { pending: 0, deadLettered: 0, oldestPendingAt: null }
  }

  deadLetters(tenantId: string, limit: number) {
    return this.prisma.$queryRaw<
      Array<{
        id: string
        eventType: string
        createdAt: Date
        attempts: number
        lastError: string | null
      }>
    >`
      SELECT id::text, event_type AS "eventType", created_at AS "createdAt",
             attempts, last_error AS "lastError"
      FROM coaching.event_outbox
      WHERE tenant_id = ${tenantId}::uuid
        AND published_at IS NULL
        AND attempts >= ${MAX_ATTEMPTS}
      ORDER BY created_at
      LIMIT ${limit}
    `
  }

  async replay(tenantId: string, id: string): Promise<boolean> {
    const changed = await this.prisma.$executeRaw`
      UPDATE coaching.event_outbox
      SET attempts = 0, last_error = NULL, next_attempt_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${id}::uuid
        AND published_at IS NULL
    `
    return changed === 1
  }
}
