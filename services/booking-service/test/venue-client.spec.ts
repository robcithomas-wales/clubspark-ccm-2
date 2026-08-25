import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServiceUnavailableException } from '@nestjs/common'
import { VenueClient } from '../src/venue/venue.client.js'

function client() {
  return new VenueClient({
    get: (key: string) => (key === 'venueService.url' ? 'http://venue.test' : undefined),
  } as never)
}

describe('VenueClient capacity contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the tenant-scoped active bookable unit count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { count: 7 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(client().getActiveBookableUnitCount('tenant-1')).resolves.toBe(7)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://venue.test/venue-reference/internal/active-bookable-unit-count',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-tenant-id': 'tenant-1' }),
      }),
    )
  })

  it.each([{ data: {} }, { data: { count: -1 } }, { data: { count: 1.5 } }])(
    'rejects an invalid capacity response instead of treating it as zero',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))

      await expect(client().getActiveBookableUnitCount('tenant-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )
    },
  )

  it('fails the calculation when venue-service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))

    await expect(client().getActiveBookableUnitCount('tenant-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })

  it('loads the projection snapshot through the internal tenant contract', async () => {
    const body = {
      data: {
        generatedAt: '2026-08-24T12:00:00.000Z',
        resources: [],
        bookableUnits: [],
        unitConflicts: [],
      },
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
    vi.stubGlobal('fetch', fetchMock)

    await expect(client().fetchBookingProjectionSnapshot('tenant-1')).resolves.toEqual(body.data)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://venue.test/venue-reference/internal/booking-projection-snapshot',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-tenant-id': 'tenant-1' }),
      }),
    )
  })
})
