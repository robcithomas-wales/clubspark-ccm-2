import { Injectable } from '@nestjs/common'
import { VenuesRepository } from './venues.repository.js'

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

  listVenues(tenantId: string) {
    return this.repo.findAll(tenantId)
  }

  getSettings(venueId: string) {
    return this.repo.getSettings(venueId)
  }

  upsertSettings(venueId: string, data: VenueSettingsData) {
    return this.repo.upsertSettings(venueId, data)
  }

  async getPublicConfig(clubCode: string) {
    const org = await this.repo.findByClubCode(clubCode)
    if (!org) return null
    return {
      tenantId: org.tenantId,
      venueName: org.name,
      appName: org.appName ?? org.name,
      primaryColour: org.primaryColour,
      secondaryColour: org.secondaryColour,
      logoUrl: org.logoUrl,
      clubCode: org.clubCode,
    }
  }
}
