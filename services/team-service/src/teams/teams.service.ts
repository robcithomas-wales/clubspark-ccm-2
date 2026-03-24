import { Injectable, NotFoundException } from '@nestjs/common'
import { TeamsRepository } from './teams.repository.js'
import type { CreateTeamDto } from './dto/create-team.dto.js'
import type { UpdateTeamDto } from './dto/update-team.dto.js'

@Injectable()
export class TeamsService {
  constructor(private readonly repo: TeamsRepository) {}

  async list(tenantId: string, sport?: string, activeOnly?: boolean) {
    const teams = await this.repo.list(tenantId, sport, activeOnly)
    return { data: teams, pagination: { total: teams.length } }
  }

  async findById(tenantId: string, id: string) {
    const team = await this.repo.findById(tenantId, id)
    if (!team) throw new NotFoundException('Team not found')
    return { data: team }
  }

  async create(tenantId: string, dto: CreateTeamDto) {
    const team = await this.repo.create(tenantId, dto)
    return { data: team }
  }

  async update(tenantId: string, id: string, dto: UpdateTeamDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Team not found')
    const team = await this.repo.update(tenantId, id, dto)
    return { data: team }
  }
}
