import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SponsorsRepository } from './sponsors.repository.js'
import type { CreateSponsorDto } from './dto/create-sponsor.dto.js'
import type { UpdateSponsorDto } from './dto/update-sponsor.dto.js'

@Injectable()
export class SponsorsService {
  constructor(private readonly repo: SponsorsRepository) {}

  async list(tenantId: string, activeOnly = true) {
    const sponsors = await this.repo.list(tenantId, activeOnly)
    return { data: sponsors }
  }

  async create(tenantId: string, dto: CreateSponsorDto) {
    const orgId = await this.repo.findOrgId(tenantId)
    if (!orgId) throw new BadRequestException('Organisation not found for tenant')
    const sponsor = await this.repo.create(tenantId, orgId, dto)
    return { data: sponsor }
  }

  async update(tenantId: string, id: string, dto: UpdateSponsorDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Sponsor not found')
    const sponsor = await this.repo.update(tenantId, id, dto)
    return { data: sponsor }
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Sponsor not found')
    await this.repo.remove(tenantId, id)
    return { data: { success: true } }
  }
}
