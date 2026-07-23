import { Injectable, NotFoundException } from '@nestjs/common'
import { OrganisationsRepository } from './organisations.repository.js'
import type { UpsertOrganisationDto } from './dto/upsert-organisation.dto.js'
import type { PatchHomePageDto } from './dto/patch-home-page.dto.js'
import type { PatchDesignDto } from './dto/patch-design.dto.js'

@Injectable()
export class OrganisationsService {
  constructor(private readonly repo: OrganisationsRepository) {}

  async getMyOrg(tenantId: string) {
    const org = await this.repo.findByTenantId(tenantId)
    return { data: org ?? null }
  }

  async upsert(tenantId: string, dto: UpsertOrganisationDto) {
    const org = await this.repo.upsert(tenantId, dto)
    void this.syncToAdminService(tenantId, org)
    return { data: org }
  }

  private async syncToAdminService(tenantId: string, org: { name: string; slug: string; email?: string | null }) {
    const adminUrl = process.env['ADMIN_SERVICE_URL']
    const secret = process.env['INTERNAL_SECRET']
    if (!adminUrl || !secret) return
    await fetch(`${adminUrl}/v1/internal/organisations/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ tenantId, name: org.name, slug: org.slug, adminEmail: org.email ?? undefined }),
    }).catch(() => { /* non-fatal */ })
  }

  // Used by customer portal to resolve tenant from slug or custom domain
  async getBySlug(slug: string) {
    const org = await this.repo.findBySlug(slug)
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: org }
  }

  async getFirst() {
    const org = await this.repo.findFirst()
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: org }
  }

  async getByDomain(domain: string) {
    const org = await this.repo.findByCustomDomain(domain)
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: org }
  }

  async patchDesign(tenantId: string, dto: PatchDesignDto) {
    const org = await this.repo.findByTenantId(tenantId)
    if (!org) throw new NotFoundException('Organisation not found')
    return { data: await this.repo.patchDesign(tenantId, dto) }
  }

  async patchHomePage(tenantId: string, dto: PatchHomePageDto) {
    const org = await this.repo.patchHomePage(tenantId, dto)
    return { data: org }
  }
}
