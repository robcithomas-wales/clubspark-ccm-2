import { describe, expect, it, vi } from 'vitest'
import { EventInboxService } from '../src/events/event-inbox.service.js'
import type { DomainEvent } from '../src/events/domain-events.js'

const event: DomainEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  producer: 'payment-service',
  correlationId: '11111111-1111-4111-8111-111111111111',
  schemaVersion: 1,
  type: 'payment.succeeded',
  tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  occurredAt: '2026-08-24T10:00:00.000Z',
}

describe('EventInboxService', () => {
  it('does not repeat a completed or currently claimed event', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      write: { $queryRaw: vi.fn().mockResolvedValue([]) },
    } as never)

    await expect(service.process(event, handler)).resolves.toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('marks a claimed event completed after its handler succeeds', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const write = {
      $queryRaw: vi.fn().mockResolvedValue([{ eventId: event.eventId }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    }
    const service = new EventInboxService({ write } as never)

    await expect(service.process(event, handler)).resolves.toBe(true)
    expect(handler).toHaveBeenCalledOnce()
    expect(write.$executeRaw).toHaveBeenCalledOnce()
  })

  it('records failure and rethrows so the producer retains its outbox row', async () => {
    const failure = new Error('downstream unavailable')
    const write = {
      $queryRaw: vi.fn().mockResolvedValue([{ eventId: event.eventId }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    }
    const service = new EventInboxService({ write } as never)

    await expect(service.process(event, () => Promise.reject(failure))).rejects.toThrow(failure)
    expect(write.$executeRaw).toHaveBeenCalledOnce()
  })
})
