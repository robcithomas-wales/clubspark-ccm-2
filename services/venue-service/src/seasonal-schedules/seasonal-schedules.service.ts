import { Injectable, NotFoundException } from '@nestjs/common'
import { SeasonalSchedulesRepository, CreateSeasonalScheduleDto, UpdateSeasonalScheduleDto } from './seasonal-schedules.repository.js'

@Injectable()
export class SeasonalSchedulesService {
  constructor(private readonly repo: SeasonalSchedulesRepository) {}

  async list(tenantId: string, venueId?: string, status?: string) {
    return this.repo.findAll(tenantId, venueId, status)
  }

  async getById(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id)
    if (!row) throw new NotFoundException(`Seasonal schedule ${id} not found`)
    return row
  }

  async create(tenantId: string, dto: CreateSeasonalScheduleDto) {
    return this.repo.create(tenantId, dto)
  }

  async update(tenantId: string, id: string, dto: UpdateSeasonalScheduleDto) {
    const row = await this.repo.update(tenantId, id, dto)
    if (!row) throw new NotFoundException(`Seasonal schedule ${id} not found`)
    return row
  }

  async remove(tenantId: string, id: string) {
    const row = await this.repo.delete(tenantId, id)
    if (!row) throw new NotFoundException(`Seasonal schedule ${id} not found`)
  }
}
