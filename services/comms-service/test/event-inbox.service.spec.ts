import { describe, expect, it, vi } from 'vitest'
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

describe('EventInboxService', () => {
  it('suppresses an event that is completed or already being handled', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      write: { $queryRaw: vi.fn().mockResolvedValue([]) },
    } as never)

    await expect(service.process(event, handler)).resolves.toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('completes one claimed handler', async () => {
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
})
