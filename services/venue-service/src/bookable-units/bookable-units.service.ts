import { Injectable } from '@nestjs/common'
import { BookableUnitsRepository } from './bookable-units.repository.js'
import type { CreateBookableUnitDto } from './dto/create-bookable-unit.dto.js'

@Injectable()
export class BookableUnitsService {
  constructor(private readonly repo: BookableUnitsRepository) {}

  listAll(tenantId: string) {
    return this.repo.findAll(tenantId)
  }

  listByVenue(tenantId: string, venueId: string) {
    return this.repo.findByVenue(tenantId, venueId)
  }

  create(tenantId: string, dto: CreateBookableUnitDto) {
    return this.repo.create(tenantId, dto)
  }

  async getConflicts(unitId: string) {
    const conflictingUnitIds = await this.repo.findConflictingUnitIds(unitId)
    return { unitId, conflictingUnitIds }
  }
}
