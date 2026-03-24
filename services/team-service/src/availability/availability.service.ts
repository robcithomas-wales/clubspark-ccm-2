import { Injectable } from '@nestjs/common'
import { AvailabilityRepository } from './availability.repository.js'

@Injectable()
export class AvailabilityService {
  constructor(private readonly repo: AvailabilityRepository) {}

  async getForFixture(tenantId: string, fixtureId: string) {
    const responses = await this.repo.getForFixture(tenantId, fixtureId)
    const summary = {
      available: responses.filter((r) => r.response === 'available').length,
      maybe: responses.filter((r) => r.response === 'maybe').length,
      unavailable: responses.filter((r) => r.response === 'unavailable').length,
      noResponse: responses.filter((r) => r.response === 'no_response').length,
      total: responses.length,
    }
    return { data: responses, summary }
  }

  async respond(tenantId: string, fixtureId: string, teamMemberId: string, response: string, notes?: string) {
    const result = await this.repo.upsertResponse(fixtureId, teamMemberId, response, notes)
    return { data: result }
  }

  async requestAll(tenantId: string, fixtureId: string, teamId: string) {
    const responses = await this.repo.requestForAllMembers(fixtureId, teamId, tenantId)
    return { data: responses, requested: responses.length }
  }
}
