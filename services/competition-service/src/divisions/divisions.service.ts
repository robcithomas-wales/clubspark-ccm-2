import { Injectable, NotFoundException } from '@nestjs/common'
import { DivisionsRepository } from './divisions.repository.js'
import type { CreateDivisionDto } from './dto/create-division.dto.js'

@Injectable()
export class DivisionsService {
  constructor(private readonly repo: DivisionsRepository) {}

  async list(competitionId: string) { return { data: await this.repo.list(competitionId) } }

  async create(competitionId: string, dto: CreateDivisionDto) {
    const d = await this.repo.create(competitionId, dto)
    return { data: d }
  }

  async delete(competitionId: string, id: string) {
    const existing = await this.repo.findById(id, competitionId)
    if (!existing) throw new NotFoundException('Division not found')
    await this.repo.delete(id, competitionId)
  }
}
