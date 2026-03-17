import { Injectable, NotFoundException } from '@nestjs/common'
import { BlackoutDatesRepository } from './blackout-dates.repository.js'
import type { CreateBlackoutDateDto } from './dto/create-blackout-date.dto.js'
import type { UpdateBlackoutDateDto } from './dto/update-blackout-date.dto.js'

@Injectable()
export class BlackoutDatesService {
  constructor(private readonly repo: BlackoutDatesRepository) {}

  list(tenantId: string, venueId?: string, resourceId?: string) {
    return this.repo.findAll(tenantId, venueId, resourceId)
  }

  async getById(tenantId: string, id: string) {
    const record = await this.repo.findById(tenantId, id)
    if (!record) throw new NotFoundException('Blackout date not found')
    return record
  }

  create(tenantId: string, dto: CreateBlackoutDateDto) {
    return this.repo.create(tenantId, dto)
  }

  async update(tenantId: string, id: string, dto: UpdateBlackoutDateDto) {
    const updated = await this.repo.update(tenantId, id, dto)
    if (!updated) throw new NotFoundException('Blackout date not found')
    return updated
  }

  async remove(tenantId: string, id: string) {
    const deleted = await this.repo.delete(tenantId, id)
    if (!deleted) throw new NotFoundException('Blackout date not found')
  }
}
