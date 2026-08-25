import { vi } from 'vitest'
import { EventBusService, type VenueProjectionEvent } from '../src/event-bus/event-bus.service.js'

describe('EventBusService', () => {
  const originalFetch = global.fetch
  const originalSecret = process.env['INTERNAL_SECRET']

  afterEach(() => {
    global.fetch = originalFetch
    if (originalSecret === undefined) delete process.env['INTERNAL_SECRET']
    else process.env['INTERNAL_SECRET'] = originalSecret
    vi.restoreAllMocks()
  })

  const event: VenueProjectionEvent = {
    eventId: '11111111-1111-4111-8111-111111111111',
    type: 'venue.resource.upserted.v1',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    occurredAt: '2026-08-24T10:00:00.000Z',
    sourceUpdatedAt: '2026-08-24T10:00:00.000Z',
    data: { id: '22222222-2222-4222-8222-222222222222' },
  }

  function service() {
    return new EventBusService({
      get: vi.fn().mockReturnValue({ url: 'http://booking.test' }),
    } as never)
  }

  it('publishes with tenant identity and the internal secret', async () => {
    process.env['INTERNAL_SECRET'] = 'test-secret'
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 202 }) as never

    await service().publish(event)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://booking.test/booking-projections/internal/venue/events',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': event.tenantId,
          'x-internal-secret': 'test-secret',
        },
        body: JSON.stringify(event),
      }),
    )
  })

  it('throws on a non-success response so the outbox retries', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as never

    await expect(service().publish(event)).rejects.toThrow(
      'Booking projection consumer returned 503',
    )
  })
})
