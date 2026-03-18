import { Injectable, NotFoundException } from '@nestjs/common'
import { OrganisationsRepository } from './organisations.repository.js'
import type { UpsertOrganisationDto } from './dto/upsert-organisation.dto.js'

@Injectable()
export class OrganisationsService {
  constructor(private readonly repo: OrganisationsRepository) {}

  async getMyOrg(tenantId: string) {
    const org = await this.repo.findByTenantId(tenantId)
    return { data: org ?? null }
  }

  async upsert(tenantId: string, dto: UpsertOrganisationDto) {
    const org = await this.repo.upsert(tenantId, dto)
    return { data: org }
  }

  // Used by customer portal to resolve tenant from slug or custom domain
  async getBySlug(slug: string) {
    const org = await this.repo.findBySlug(slug)
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: org }
  }

  async getByDomain(domain: string) {
    const org = await this.repo.findByCustomDomain(domain)
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: org }
  }
}
