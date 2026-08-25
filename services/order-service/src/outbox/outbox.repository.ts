import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { DomainEvent } from '../event-bus/event-bus.service.js'

export interface PendingEvent {
  id: string
  eventType: string
  payload: DomainEvent
  attempts: number
}

export const MAX_ATTEMPTS = 10

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(tx: Prisma.TransactionClient, event: DomainEvent): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO commerce.event_outbox (tenant_id, event_type, payload)
      VALUES (${event.tenantId}::uuid, ${event.type}, ${JSON.stringify(event)}::jsonb)
    `
  }

  async claimBatch(tx: Prisma.TransactionClient, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      SELECT id::text, event_type AS "eventType", payload, attempts
      FROM commerce.event_outbox
      WHERE published_at IS NULL
        AND attempts < ${MAX_ATTEMPTS}
        AND next_attempt_at <= now()
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `
  }

  async markPublished(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE commerce.event_outbox
      SET published_at = now(), last_error = NULL
      WHERE id = ${id}::uuid
    `
  }

  async markFailed(
    tx: Prisma.TransactionClient,
    id: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    const delaySeconds = Math.min(2 ** attempts, 3600)
    await tx.$executeRaw`
      UPDATE commerce.event_outbox
      SET attempts = attempts + 1,
          last_error = ${error.slice(0, 1000)},
          next_attempt_at = now() + make_interval(secs => ${delaySeconds})
      WHERE id = ${id}::uuid
    `
  }

  async countDeadLettered(): Promise<number> {
    const rows = await this.prisma.read.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM commerce.event_outbox
      WHERE published_at IS NULL AND attempts >= ${MAX_ATTEMPTS}
    `
    return rows[0]?.n ?? 0
  }
}
