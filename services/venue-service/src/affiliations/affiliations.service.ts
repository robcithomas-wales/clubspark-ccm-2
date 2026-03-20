import { Injectable, NotFoundException } from '@nestjs/common'
import { AffiliationsRepository } from './affiliations.repository.js'
import type { CreateAffiliationDto } from './dto/create-affiliation.dto.js'
import type { UpdateAffiliationDto } from './dto/update-affiliation.dto.js'

@Injectable()
export class AffiliationsService {
  constructor(private readonly repo: AffiliationsRepository) {}

  async list(tenantId: string) {
    const rows = await this.repo.findAll(tenantId)
    return { data: rows }
  }

  async getById(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id)
    if (!row) throw new NotFoundException('Affiliation not found')
    return { data: row }
  }

  async create(tenantId: string, dto: CreateAffiliationDto) {
    const row = await this.repo.create(tenantId, dto)
    return { data: row }
  }

  async update(tenantId: string, id: string, dto: UpdateAffiliationDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Affiliation not found')
    await this.repo.update(tenantId, id, dto)
    return this.getById(tenantId, id)
  }
}
