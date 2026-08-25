import { BadRequestException, Injectable } from '@nestjs/common'
import { CoachingClient } from '../coaching/coaching.client.js'
import type { CoachingOccupancyEventDto } from './dto/coaching-occupancy-event.dto.js'
import { VenueClient } from '../venue/venue.client.js'
import { ProjectionsRepository } from './projections.repository.js'
import type { VenueProjectionEventDto } from './dto/venue-projection-event.dto.js'

@Injectable()
export class ProjectionsService {
  constructor(
    private readonly venue: VenueClient,
    private readonly repository: ProjectionsRepository,
    private readonly coaching: CoachingClient,
  ) {}

  async refreshVenue(tenantId: string) {
    const snapshot = await this.venue.fetchBookingProjectionSnapshot(tenantId)
    return this.repository.replaceVenueSnapshot(tenantId, snapshot)
  }

  status(tenantId: string) {
    return this.repository.status(tenantId)
  }

  async reconcile(tenantId: string) {
    const [venue, coaching] = await Promise.all([
      this.venue.fetchBookingProjectionSnapshot(tenantId),
      this.coaching.fetchOccupancySnapshot(tenantId),
    ])
    return this.repository.reconcile(tenantId, venue, coaching)
  }

  async refreshCoaching(tenantId: string) {
    return this.repository.replaceCoachingSnapshot(
      tenantId,
      await this.coaching.fetchOccupancySnapshot(tenantId),
    )
  }

  applyCoachingEvent(headerTenantId: string, event: CoachingOccupancyEventDto) {
    if (headerTenantId !== event.tenantId)
      throw new BadRequestException('x-tenant-id must match event tenantId')
    const data = event.data
    // Non-empty strings, not UUID variants. class-validator's isUUID is
    // variant-strict and rejects the platform's own default tenant/org ids
    // ('aaaaaaaa-…', '11111111-…'), so a UUID check here 400s every seed-tenant
    // event — which the producer's relay reads as a delivery failure, retries ten
    // times and dead-letters, leaving the projection silently diverged.
    if (typeof data['id'] !== 'string' || !data['id'])
      throw new BadRequestException('event data.id is required')
    if (event.type === 'coaching.occupancy.upserted.v1') {
      if (typeof data['bookableUnitId'] !== 'string' || !data['bookableUnitId'])
        throw new BadRequestException('event data.bookableUnitId is required')
      if (typeof data['status'] !== 'string' || !data['status'])
        throw new BadRequestException('event data.status is required')
      for (const field of ['startsAt', 'endsAt']) {
        if (typeof data[field] !== 'string' || Number.isNaN(new Date(data[field]).getTime()))
          throw new BadRequestException(`event data.${field} must be a timestamp`)
      }
      if (new Date(data['endsAt'] as string) <= new Date(data['startsAt'] as string)) {
        throw new BadRequestException('event data.endsAt must be after startsAt')
      }
    }
    return this.repository.applyCoachingEvent(event)
  }

  applyVenueEvent(headerTenantId: string, event: VenueProjectionEventDto) {
    if (headerTenantId !== event.tenantId) {
      throw new BadRequestException('x-tenant-id must match event tenantId')
    }
    this.validateVenueEvent(event)
    return this.repository.applyVenueEvent(event)
  }

  private validateVenueEvent(event: VenueProjectionEventDto): void {
    const data = event.data
    const requireId = (field: string) => {
      if (typeof data[field] !== 'string' || !data[field]) {
        throw new BadRequestException(`event data.${field} is required`)
      }
    }
    const requireString = (field: string) => {
      if (typeof data[field] !== 'string' || !data[field]) {
        throw new BadRequestException(`event data.${field} is required`)
      }
    }
    requireId('id')

    if (event.type === 'venue.resource.upserted.v1') {
      requireId('venueId')
      if (typeof data['isActive'] !== 'boolean') {
        throw new BadRequestException('event data.isActive must be boolean')
      }
    }
    if (event.type === 'venue.bookable-unit.upserted.v1') {
      requireId('venueId')
      requireId('resourceId')
      requireString('name')
      requireString('unitType')
      if (typeof data['isActive'] !== 'boolean') {
        throw new BadRequestException('event data.isActive must be boolean')
      }
    }
    if (
      event.type === 'venue.unit-conflicts.replaced.v1' &&
      (!Array.isArray(data['conflictingUnitIds']) ||
        !data['conflictingUnitIds'].every((id) => typeof id === 'string' && id.length > 0))
    ) {
      throw new BadRequestException('event data.conflictingUnitIds must be a string array')
    }
  }
}
