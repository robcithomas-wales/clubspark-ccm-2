import { Injectable, NotFoundException } from '@nestjs/common'
import { VenuesRepository } from './venues.repository.js'
import { assertFeature } from '../common/entitlement.js'

type VenueSettingsData = {
  openBookings?: boolean
  addOnsEnabled?: boolean
  pendingApprovals?: boolean
  splitPayments?: boolean
  publicBookingView?: string
}

@Injectable()
export class VenuesService {
  constructor(private readonly repo: VenuesRepository) {}

  async createVenue(data: {
    id: string
    tenantId: string
    organisationId?: string | null
    name: string
    timezone: string
    city?: string | null
    country: string
  }) {
    // Verify the organisationId actually exists in the DB before linking it
    if (data.organisationId) {
      const org = await this.repo.findOrganisationByTenantId(data.tenantId)
      if (!org || org.id !== data.organisationId) {
        data = { ...data, organisationId: null }
      }
    }

    // Multisite gate: organisations on the Core plan may only have one venue.
    // If this org already has at least one venue, require the 'multisite' feature.
    if (data.organisationId) {
      const existing = await this.repo.countByOrganisation(data.organisationId)
      if (existing >= 1) {
        await assertFeature(data.organisationId, 'multisite', data.tenantId)
      }
    }

    return this.repo.create(data)
  }

  listVenues(tenantId: string) {
    return this.repo.findAll(tenantId)
  }

  async getSettings(tenantId: string, venueId: string) {
    // Ensure the venue belongs to the caller's tenant before exposing its settings.
    const venue = await this.repo.findById(tenantId, venueId)
    if (!venue) throw new NotFoundException('Venue not found')
    return this.repo.getSettings(venueId)
  }

  async upsertSettings(tenantId: string, venueId: string, data: VenueSettingsData) {
    // Ensure the venue belongs to the caller's tenant before mutating its settings.
    const venue = await this.repo.findById(tenantId, venueId)
    if (!venue) throw new NotFoundException('Venue not found')
    return this.repo.upsertSettings(venueId, data)
  }

  async getPublicConfig(clubCode: string) {
    const org = await this.repo.findByClubCode(clubCode)
    if (!org) return null
    return {
      organisationId: org.id,
      tenantId: org.tenantId,
      venueName: org.name,
      appName: org.appName ?? org.name,
      about: org.about ?? null,
      primaryColour: org.primaryColour,
      secondaryColour: org.secondaryColour,
      logoUrl: org.logoUrl,
      clubCode: org.clubCode,
    }
  }
}
