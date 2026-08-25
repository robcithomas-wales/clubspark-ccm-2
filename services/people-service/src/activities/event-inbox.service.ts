import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service.js'

interface InboundEvent {
  eventId?: string
  producer?: string
  tenantId: string
  type: string
  [key: string]: unknown
}

export type InboxOutcome = 'processed' | 'duplicate' | 'busy' | 'payloadConflict'

@Injectable()
export class EventInboxService {
  private readonly logger = new Logger(EventInboxService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Claim an event, run its handler once, and say what happened.
   *
   * `busy` and `payloadConflict` are NOT acknowledgements: the caller must
   * answer the producer with a retryable status, or the outbox row is marked
   * published and the work is never done by anyone.
   */
  async process(event: InboundEvent, handler: () => Promise<void>): Promise<InboxOutcome> {
    if (!event.eventId || !event.producer) {
      // No envelope identity, so no dedupe is possible: the side effect can be
      // replayed by anyone who can reach this route. Run it, but say so.
      this.logger.warn(
        { type: event.type, producer: event.producer },
        'Event carries no eventId/producer — processed without an idempotency record',
      )
      await handler()
      return 'processed'
    }

    const ownerId = randomUUID()
    const payloadHash = createHash('sha256').update(JSON.stringify(event)).digest('hex')
    const claimed = await this.prisma.$queryRaw<{ eventId: string }[]>`
      INSERT INTO people.event_inbox AS inbox
        (producer, event_id, tenant_id, event_type, payload_hash, owner_id, lease_until)
      VALUES
        (${event.producer}, ${event.eventId}, ${event.tenantId}::uuid, ${event.type},
         ${payloadHash}, ${ownerId}, now() + interval '15 minutes')
      ON CONFLICT (producer, event_id) DO UPDATE
      SET status = 'processing', owner_id = EXCLUDED.owner_id,
          lease_until = EXCLUDED.lease_until, attempts = inbox.attempts + 1,
          last_error = NULL, updated_at = now()
      WHERE (inbox.status = 'failed'
             OR (inbox.status = 'processing' AND inbox.lease_until <= now()))
        AND inbox.payload_hash = EXCLUDED.payload_hash
      RETURNING event_id AS "eventId"
    `
    if (claimed.length === 0) {
      // Distinguish "already done" from "someone else is mid-flight" from
      // "same event id, different payload" — only the first is safe to ack.
      const [existing] = await this.prisma.$queryRaw<{ status: string; payloadHash: string }[]>`
        SELECT status, payload_hash AS "payloadHash"
        FROM people.event_inbox
        WHERE producer = ${event.producer} AND event_id = ${event.eventId}
      `
      if (!existing) return 'busy'
      if (existing.payloadHash !== payloadHash) return 'payloadConflict'
      return existing.status === 'completed' ? 'duplicate' : 'busy'
    }

    try {
      await handler()
      await this.prisma.$executeRaw`
        UPDATE people.event_inbox
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE producer = ${event.producer} AND event_id = ${event.eventId} AND owner_id = ${ownerId}
      `
      return 'processed'
    } catch (err) {
      await this.prisma.$executeRaw`
        UPDATE people.event_inbox
        SET status = 'failed', last_error = ${String(err).slice(0, 1000)}, updated_at = now()
        WHERE producer = ${event.producer} AND event_id = ${event.eventId} AND owner_id = ${ownerId}
      `
      throw err
    }
  }
}
