import { Injectable } from '@nestjs/common'
import { VenuesRepository } from './venues.repository.js'

type VenueSettingsData = {
  openBookings?: boolean
  addOnsEnabled?: boolean
  pendingApprovals?: boolean
  splitPayments?: boolean
  publicBookingView?: string
  clubCode?: string | null
  primaryColour?: string
  logoUrl?: string | null
  appName?: string | null
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
    const row = await this.repo.findByClubCode(clubCode)
    if (!row) return null
    return {
      tenantId: row.venue.tenantId,
      venueName: row.venue.name,
      appName: row.appName ?? row.venue.name,
      primaryColour: row.primaryColour,
      logoUrl: row.logoUrl,
      clubCode: row.clubCode,
    }
  }
}
