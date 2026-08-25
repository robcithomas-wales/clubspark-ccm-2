import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index'
import { PrismaService } from '../prisma/prisma.service'
import type { DomainEvent } from '../event-bus/event-bus.service'

/** A row the relay still owes delivery for. */
export interface PendingEvent {
  id: string
  eventType: string
  payload: DomainEvent
  attempts: number
}

/** Give up after this many failures and leave the row for a human. */
export const MAX_ATTEMPTS = 10

/** How long a claimed row is hidden from other relay replicas. */
export const LEASE_SECONDS = 60

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
      INSERT INTO membership.event_outbox (tenant_id, event_type, payload)
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
  /**
   * Claim a batch under a short lease.
   *
   * `FOR UPDATE SKIP LOCKED` alone only holds other workers off until this
   * transaction commits, and the relay must commit before publishing — holding a
   * write transaction open across HTTP fan-out exceeds Prisma's transaction
   * timeout (so nothing is recorded and the batch redelivers forever) and pins
   * the service's single pooled write connection for the duration. Pushing
   * `next_attempt_at` forward makes the claim outlive the transaction, so another
   * replica skips these rows while they are in flight.
   */
  async claimBatch(tx: Prisma.TransactionClient, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      WITH candidates AS (
        SELECT id
        FROM membership.event_outbox
        WHERE published_at IS NULL
          AND attempts < ${MAX_ATTEMPTS}
          AND next_attempt_at <= now()
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      ), leased AS (
        UPDATE membership.event_outbox outbox
        SET next_attempt_at = now() + make_interval(secs => ${LEASE_SECONDS})
        FROM candidates
        WHERE outbox.id = candidates.id
        RETURNING outbox.id, outbox.event_type, outbox.payload, outbox.attempts, outbox.created_at
      )
      SELECT id::text, event_type AS "eventType", payload, attempts
      FROM leased
      ORDER BY created_at
    `
  }

  async markPublished(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE membership.event_outbox
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
      UPDATE membership.event_outbox
      SET attempts        = attempts + 1,
          last_error      = ${error.slice(0, 1000)},
          next_attempt_at = now() + make_interval(secs => ${delaySeconds})
      WHERE id = ${id}::uuid
    `
  }

  /** Undelivered events that have exhausted their retries — needs a human. */
  async countDeadLettered(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM membership.event_outbox
      WHERE published_at IS NULL AND attempts >= ${MAX_ATTEMPTS}
    `
    return rows[0]?.n ?? 0
  }
}
