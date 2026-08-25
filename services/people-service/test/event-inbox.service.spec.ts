import { describe, expect, it, vi } from 'vitest'
import { EventInboxService } from '../src/activities/event-inbox.service.js'

const event = {
  eventId: '11111111-1111-4111-8111-111111111111',
  producer: 'booking-service',
  type: 'booking.confirmed',
  tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
}

describe('EventInboxService', () => {
  it('suppresses a completed or currently claimed event', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const service = new EventInboxService({
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as never)

    await expect(service.process(event, handler)).resolves.toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('marks one claimed event complete', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ eventId: event.eventId }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
    }
    const service = new EventInboxService(prisma as never)

    await expect(service.process(event, handler)).resolves.toBe(true)
    expect(handler).toHaveBeenCalledOnce()
    expect(prisma.$executeRaw).toHaveBeenCalledOnce()
  })
})
