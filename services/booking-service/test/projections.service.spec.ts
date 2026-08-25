import { describe, expect, it, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { ProjectionsService } from '../src/projections/projections.service.js'

const snapshot = {
  generatedAt: '2026-08-24T12:00:00.000Z',
  resources: [
    {
      id: 'resource-1',
      venueId: 'venue-1',
      groupId: null,
      hasLighting: true,
      isActive: true,
      updatedAt: '2026-08-24T11:00:00.000Z',
    },
  ],
  bookableUnits: [
    {
      id: 'unit-1',
      venueId: 'venue-1',
      resourceId: 'resource-1',
      name: 'Court 1',
      unitType: 'full',
      isActive: true,
    },
  ],
  unitConflicts: [],
}

describe('ProjectionsService', () => {
  it('fetches and atomically delegates a tenant-scoped Venue snapshot', async () => {
    const venue = { fetchBookingProjectionSnapshot: vi.fn().mockResolvedValue(snapshot) }
    const repository = {
      replaceVenueSnapshot: vi.fn().mockResolvedValue({ resources: 1, bookableUnits: 1 }),
    }
    const service = new ProjectionsService(venue as never, repository as never)

    await expect(service.refreshVenue('tenant-1')).resolves.toEqual({
      resources: 1,
      bookableUnits: 1,
    })
    expect(venue.fetchBookingProjectionSnapshot).toHaveBeenCalledWith('tenant-1')
    expect(repository.replaceVenueSnapshot).toHaveBeenCalledWith('tenant-1', snapshot)
  })

  it('rejects an event when the authenticated tenant header does not match', async () => {
    const repository = { applyVenueEvent: vi.fn() }
    const service = new ProjectionsService({} as never, repository as never)
    const event = {
      eventId: 'event-1',
      type: 'venue.resource.deleted.v1' as const,
      tenantId: 'tenant-2',
      occurredAt: '2026-08-24T12:00:00.000Z',
      sourceUpdatedAt: '2026-08-24T12:00:00.000Z',
      data: { id: 'resource-1' },
    }

    expect(() => service.applyVenueEvent('tenant-1', event)).toThrow(BadRequestException)
    expect(repository.applyVenueEvent).not.toHaveBeenCalled()
  })

  it('validates and delegates a projection event', async () => {
    const repository = {
      applyVenueEvent: vi.fn().mockResolvedValue({ applied: true, reason: 'updated' }),
    }
    const service = new ProjectionsService({} as never, repository as never)
    const event = {
      eventId: '11111111-1111-4111-8111-111111111111',
      type: 'venue.bookable-unit.upserted.v1' as const,
      tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      occurredAt: '2026-08-24T12:00:00.000Z',
      sourceUpdatedAt: '2026-08-24T12:00:00.000Z',
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        venueId: '33333333-3333-4333-8333-333333333333',
        resourceId: '44444444-4444-4444-8444-444444444444',
        name: 'Court 1',
        unitType: 'full',
        isActive: true,
      },
    }

    await expect(
      service.applyVenueEvent('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', event),
    ).resolves.toEqual({
      applied: true,
      reason: 'updated',
    })
    expect(repository.applyVenueEvent).toHaveBeenCalledWith(event)
  })

  it('fetches and delegates a tenant-scoped Coaching snapshot', async () => {
    const coachingSnapshot = {
      generatedAt: '2026-08-24T12:00:00.000Z',
      occupancies: [],
    }
    const coaching = { fetchOccupancySnapshot: vi.fn().mockResolvedValue(coachingSnapshot) }
    const repository = { replaceCoachingSnapshot: vi.fn().mockResolvedValue({ occupancies: 0 }) }
    const service = new ProjectionsService({} as never, repository as never, coaching as never)

    await expect(service.refreshCoaching('tenant-1')).resolves.toEqual({ occupancies: 0 })
    expect(repository.replaceCoachingSnapshot).toHaveBeenCalledWith('tenant-1', coachingSnapshot)
  })

  it('reconciles fresh source snapshots against Booking projections', async () => {
    const venue = { fetchBookingProjectionSnapshot: vi.fn().mockResolvedValue(snapshot) }
    const coachingSnapshot = { generatedAt: snapshot.generatedAt, occupancies: [] }
    const coaching = { fetchOccupancySnapshot: vi.fn().mockResolvedValue(coachingSnapshot) }
    const repository = { reconcile: vi.fn().mockResolvedValue({ matches: true }) }
    const service = new ProjectionsService(venue as never, repository as never, coaching as never)

    await expect(service.reconcile('tenant-1')).resolves.toEqual({ matches: true })
    expect(repository.reconcile).toHaveBeenCalledWith('tenant-1', snapshot, coachingSnapshot)
  })

  it('validates and delegates a Coaching occupancy event', async () => {
    const repository = { applyCoachingEvent: vi.fn().mockResolvedValue({ applied: true }) }
    const service = new ProjectionsService({} as never, repository as never, {} as never)
    const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const event = {
      eventId: '11111111-1111-4111-8111-111111111111',
      type: 'coaching.occupancy.upserted.v1' as const,
      tenantId,
      occurredAt: '2026-08-24T12:00:00.000Z',
      sourceUpdatedAt: '2026-08-24T12:00:00.000Z',
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        bookableUnitId: '33333333-3333-4333-8333-333333333333',
        startsAt: '2026-08-24T12:00:00.000Z',
        endsAt: '2026-08-24T13:00:00.000Z',
        status: 'scheduled',
      },
    }
    await expect(service.applyCoachingEvent(tenantId, event)).resolves.toEqual({ applied: true })
    expect(repository.applyCoachingEvent).toHaveBeenCalledWith(event)
  })
})
