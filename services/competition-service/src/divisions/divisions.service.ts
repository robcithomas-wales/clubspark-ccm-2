import { Injectable, NotFoundException } from '@nestjs/common'
import { DivisionsRepository } from './divisions.repository.js'
import { CompetitionsRepository } from '../competitions/competitions.repository.js'
import type { CreateDivisionDto } from './dto/create-division.dto.js'

@Injectable()
export class DivisionsService {
  constructor(
    private readonly repo: DivisionsRepository,
    private readonly competitionsRepo: CompetitionsRepository,
  ) {}

  async list(tenantId: string, competitionId: string) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    return { data: await this.repo.list(competitionId) }
  }

  async create(tenantId: string, competitionId: string, dto: CreateDivisionDto) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    const d = await this.repo.create(competitionId, dto)
    return { data: d }
  }

  async delete(tenantId: string, competitionId: string, id: string) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    const existing = await this.repo.findById(id, competitionId)
    if (!existing) throw new NotFoundException('Division not found')
    await this.repo.delete(id, competitionId)
  }

  /**
   * Loads the competition scoped to the caller's tenant. Divisions carry no tenant_id of
   * their own, so this is the tenant boundary and must run before any read/write.
   */
  private async assertCompetitionInTenant(tenantId: string, competitionId: string): Promise<void> {
    const competition = await this.competitionsRepo.findById(tenantId, competitionId)
    if (!competition) throw new NotFoundException('Competition not found')
  }
}
