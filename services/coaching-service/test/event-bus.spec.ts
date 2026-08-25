import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventBusService, type CoachingOccupancyEvent } from '../src/event-bus/event-bus.service.js'

describe('EventBusService', () => {
  const originalFetch = global.fetch
  const originalSecret = process.env['INTERNAL_SECRET']
  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env['INTERNAL_SECRET']
    else process.env['INTERNAL_SECRET'] = originalSecret
    vi.restoreAllMocks()
  })

  const event: CoachingOccupancyEvent = {
    eventId: '11111111-1111-4111-8111-111111111111',
    type: 'coaching.occupancy.upserted.v1',
    tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    occurredAt: '2026-08-24T10:00:00.000Z',
    sourceUpdatedAt: '2026-08-24T10:00:00.000Z',
    data: { id: '22222222-2222-4222-8222-222222222222' },
  }

  it('publishes the tenant-authenticated event and throws on failure', async () => {
    process.env['INTERNAL_SECRET'] = 'secret'
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as never
    const service = new EventBusService({
      get: vi.fn().mockReturnValue({ url: 'http://booking.test' }),
    } as never)
    await expect(service.publish(event)).rejects.toThrow('Booking projection consumer returned 503')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://booking.test/booking-projections/internal/coaching/events',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-tenant-id': event.tenantId,
          'x-internal-secret': 'secret',
        }),
      }),
    )
  })
})
