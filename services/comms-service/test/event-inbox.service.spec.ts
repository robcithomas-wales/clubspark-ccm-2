import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { EventInboxService } from '../src/events/event-inbox.service.js'
import type { DomainEvent } from '../src/events/domain-events.js'

const event = {
  eventId: '11111111-1111-4111-8111-111111111111',
  producer: 'booking-service',
  correlationId: '11111111-1111-4111-8111-111111111111',
  schemaVersion: 1,
  type: 'booking.reminder_due',
  tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  occurredAt: '2026-08-24T10:00:00.000Z',
  bookingId: '22222222-2222-4222-8222-222222222222',
  bookingReference: 'BK-1',
  bookerPersonId: '',
  bookerEmail: '',
  bookerFirstName: '',
  venueName: '',
  resourceName: '',
  bookableUnitName: '',
  startsAt: '2026-08-25T10:00:00.000Z',
  endsAt: '2026-08-25T11:00:00.000Z',
} satisfies DomainEvent

const PAYLOAD_HASH = createHash('sha256').update(JSON.stringify(event)).digest('hex')

describe('EventInboxService', () => {
  it('reports an already-completed event as a duplicate, and does not re-run it', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      write: {
        $queryRaw: vi
          .fn()
          // The claim is refused, then the row is inspected to see why.
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ status: 'completed', payloadHash: PAYLOAD_HASH }]),
      },
    } as never)

    await expect(service.process(event, handler)).resolves.toBe('duplicate')
    expect(handler).not.toHaveBeenCalled()
  })

  it('reports a live claim as busy so the caller asks the producer to retry', async () => {
    // 'busy' must never be acknowledged: the producer's relay marks the outbox row
    // published on any 2xx, so acking here would drop the event entirely.
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      write: {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ status: 'processing', payloadHash: PAYLOAD_HASH }]),
      },
    } as never)

    await expect(service.process(event, handler)).resolves.toBe('busy')
    expect(handler).not.toHaveBeenCalled()
  })

  it('reports the same eventId carrying a different payload as a conflict', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      write: {
        $queryRaw: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ status: 'completed', payloadHash: 'a-different-hash' }]),
      },
    } as never)

    await expect(service.process(event, handler)).resolves.toBe('payloadConflict')
    expect(handler).not.toHaveBeenCalled()
  })

  it('completes one claimed handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const write = {
      $queryRaw: vi.fn().mockResolvedValue([{ eventId: event.eventId }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    }
    const service = new EventInboxService({ write } as never)

    await expect(service.process(event, handler)).resolves.toBe('processed')
    expect(handler).toHaveBeenCalledOnce()
    expect(write.$executeRaw).toHaveBeenCalledOnce()
  })
})
