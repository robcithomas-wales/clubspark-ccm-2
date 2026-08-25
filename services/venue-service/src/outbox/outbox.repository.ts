import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { VenueProjectionEvent } from '../event-bus/event-bus.service.js'

export const MAX_ATTEMPTS = 10

/** How long a claimed row is hidden from other relay replicas. */
export const LEASE_SECONDS = 60

export interface PendingEvent {
  id: string
  eventType: string
  payload: VenueProjectionEvent
  attempts: number
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(tx: Prisma.TransactionClient, event: VenueProjectionEvent): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO venue.event_outbox (tenant_id, event_type, payload)
      VALUES (${event.tenantId}::uuid, ${event.type}, ${JSON.stringify(event)}::jsonb)
    `
  }

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
  claimBatch(tx: Prisma.TransactionClient, limit: number): Promise<PendingEvent[]> {
    return tx.$queryRaw<PendingEvent[]>`
      WITH candidates AS (
        SELECT id
        FROM venue.event_outbox
        WHERE published_at IS NULL
          AND attempts < ${MAX_ATTEMPTS}
          AND next_attempt_at <= now()
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      ), leased AS (
        UPDATE venue.event_outbox outbox
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
      UPDATE venue.event_outbox
      SET published_at = now(), last_error = NULL
      WHERE id = ${id}::uuid
    `
  }

  async markFailed(tx: Prisma.TransactionClient, id: string, attempts: number, error: string) {
    const delaySeconds = Math.min(2 ** attempts, 3600)
    await tx.$executeRaw`
      UPDATE venue.event_outbox
      SET attempts = attempts + 1,
          last_error = ${error.slice(0, 1000)},
          next_attempt_at = now() + make_interval(secs => ${delaySeconds})
      WHERE id = ${id}::uuid
    `
  }

  async countDeadLettered(): Promise<number> {
    const rows = await this.prisma.read.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count
      FROM venue.event_outbox
      WHERE published_at IS NULL AND attempts >= ${MAX_ATTEMPTS}
    `
    return rows[0]?.count ?? 0
  }

  async operationalStatus(tenantId: string) {
    const [row] = await this.prisma.read.$queryRaw<
      { pending: number; deadLettered: number; oldestPendingAt: Date | null }[]
    >`
      SELECT
        count(*) FILTER (WHERE attempts < ${MAX_ATTEMPTS})::int AS pending,
        count(*) FILTER (WHERE attempts >= ${MAX_ATTEMPTS})::int AS "deadLettered",
        min(created_at) FILTER (WHERE attempts < ${MAX_ATTEMPTS}) AS "oldestPendingAt"
      FROM venue.event_outbox
      WHERE tenant_id = ${tenantId}::uuid AND published_at IS NULL
    `
    return row ?? { pending: 0, deadLettered: 0, oldestPendingAt: null }
  }

  deadLetters(tenantId: string, limit: number) {
    return this.prisma.read.$queryRaw<
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
      FROM venue.event_outbox
      WHERE tenant_id = ${tenantId}::uuid
        AND published_at IS NULL
        AND attempts >= ${MAX_ATTEMPTS}
      ORDER BY created_at
      LIMIT ${limit}
    `
  }

  async replay(tenantId: string, id: string): Promise<boolean> {
    const changed = await this.prisma.write.$executeRaw`
      UPDATE venue.event_outbox
      SET attempts = 0, last_error = NULL, next_attempt_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${id}::uuid
        AND published_at IS NULL
    `
    return changed === 1
  }
}
