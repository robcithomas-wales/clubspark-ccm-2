import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { EntriesRepository } from './entries.repository.js'
import type { CreateEntryDto } from './dto/create-entry.dto.js'
import type { UpdateEntryDto } from './dto/update-entry.dto.js'

@Injectable()
export class EntriesService {
  constructor(private readonly repo: EntriesRepository) {}

  async list(competitionId: string, divisionId?: string) {
    return { data: await this.repo.list(competitionId, divisionId) }
  }

  async create(competitionId: string, dto: CreateEntryDto) {
    if (!dto.personId && !dto.teamId) throw new BadRequestException('Either personId or teamId is required')
    const entry = await this.repo.create(competitionId, dto)
    return { data: entry }
  }

  async update(competitionId: string, id: string, dto: UpdateEntryDto) {
    const existing = await this.repo.findById(id, competitionId)
    if (!existing) throw new NotFoundException('Entry not found')
    const entry = await this.repo.update(id, competitionId, dto)
    return { data: entry }
  }

  async bulkConfirm(competitionId: string, divisionId: string) {
    const result = await this.repo.bulkConfirm(competitionId, divisionId)
    return { confirmed: result.count }
  }
}
