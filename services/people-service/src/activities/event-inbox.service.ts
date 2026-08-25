import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service.js'

interface InboundEvent {
  eventId?: string
  producer?: string
  tenantId: string
  type: string
  [key: string]: unknown
}

@Injectable()
export class EventInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async process(event: InboundEvent, handler: () => Promise<void>): Promise<boolean> {
    if (!event.eventId || !event.producer) {
      await handler()
      return true
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
      WHERE (inbox.status = 'failed' OR inbox.lease_until <= now())
        AND inbox.payload_hash = EXCLUDED.payload_hash
      RETURNING event_id AS "eventId"
    `
    if (claimed.length === 0) return false

    try {
      await handler()
      await this.prisma.$executeRaw`
        UPDATE people.event_inbox
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE producer = ${event.producer} AND event_id = ${event.eventId} AND owner_id = ${ownerId}
      `
      return true
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
