import { Injectable } from '@nestjs/common'
import { VenuesRepository } from './venues.repository.js'

@Injectable()
export class VenuesService {
  constructor(private readonly repo: VenuesRepository) {}

  listVenues(tenantId: string) {
    return this.repo.findAll(tenantId)
  }
}
