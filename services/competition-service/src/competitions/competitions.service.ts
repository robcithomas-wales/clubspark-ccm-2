import { Injectable, NotFoundException } from '@nestjs/common'
import { CompetitionsRepository } from './competitions.repository.js'
import { getSportConfig } from '../sports/sport-config.js'
import type { CreateCompetitionDto } from './dto/create-competition.dto.js'
import type { UpdateCompetitionDto } from './dto/update-competition.dto.js'

@Injectable()
export class CompetitionsService {
  constructor(private readonly repo: CompetitionsRepository) {}

  async list(tenantId: string, page: number, limit: number, filters: { status?: string; sport?: string }) {
    const { competitions, total } = await this.repo.list(tenantId, page, limit, filters)
    return {
      data: competitions.map(c => ({ ...c, sportConfig: getSportConfig(c.sport) })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async findById(tenantId: string, id: string) {
    const c = await this.repo.findById(tenantId, id)
    if (!c) throw new NotFoundException('Competition not found')
    return { data: { ...c, sportConfig: getSportConfig(c.sport) } }
  }

  async create(tenantId: string, organisationId: string | undefined, dto: CreateCompetitionDto) {
    const c = await this.repo.create(tenantId, organisationId, dto)
    return { data: c }
  }

  async update(tenantId: string, id: string, dto: UpdateCompetitionDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    const c = await this.repo.update(tenantId, id, dto)
    return { data: c }
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    await this.repo.delete(tenantId, id)
  }
}
