import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { DomainEvent } from '../event-bus/event-bus.service.js'

/** A row the relay still owes delivery for. */
export interface PendingEvent {
  id: string
  eventType: string
  payload: DomainEvent
  attempts: number
}

/** Give up after this many failures and leave the row for a human. */
export const MAX_ATTEMPTS = 10

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an event for delivery, inside the caller's transaction.
   *
   * `tx` is the transaction client from the state change that produced this
   * event. Passing it is the whole point: the event and the state change commit
   * or roll back together. Publishing outside the transaction is what allowed
   * events to be lost when a subscriber was down, or emitted for a change that
   * then rolled back.
   */
  async enqueue(tx: Prisma.TransactionClient, event: DomainEvent): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO payment.event_outbox (tenant_id, event_type, payload)
      VALUES (${event.tenantId}::uuid, ${event.type}, ${JSON.stringify(event)}::jsonb)
    `
  }

  /**
   * Claim a batch of due events for delivery.
   *
   * FOR UPDATE SKIP LOCKED is what makes this safe with more than one replica:
   * each relay locks the rows it takes and others skip straight past them, so two
   * instances never deliver the same event. Without it this would need the leader
   * election in MR-6 before the platform could scale past a single replica.
   */
  async claimBatch(tx: Prisma.TransactionClient, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      SELECT id::text, event_type AS "eventType", payload, attempts
      FROM payment.event_outbox
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
      UPDATE payment.event_outbox
      SET published_at = now(), last_error = NULL
      WHERE id = ${id}::uuid
    `
  }

  /**
   * Record a failure and back off before retrying.
   *
   * Backoff is exponential and capped, so a subscriber that is down for an hour
   * does not get hammered, and a transient blip still retries quickly.
   */
  async markFailed(
    tx: Prisma.TransactionClient,
    id: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    const delaySeconds = Math.min(2 ** attempts, 3600)
    await tx.$executeRaw`
      UPDATE payment.event_outbox
      SET attempts        = attempts + 1,
          last_error      = ${error.slice(0, 1000)},
          next_attempt_at = now() + make_interval(secs => ${delaySeconds})
      WHERE id = ${id}::uuid
    `
  }

  /** Undelivered events that have exhausted their retries — needs a human. */
  async countDeadLettered(): Promise<number> {
    const rows = await this.prisma.read.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM payment.event_outbox
      WHERE published_at IS NULL AND attempts >= ${MAX_ATTEMPTS}
    `
    return rows[0]?.n ?? 0
  }
}
