import { ForbiddenException, Injectable } from '@nestjs/common'
import { OverridesRepository } from './overrides.repository.js'
import type { UpsertOverrideDto } from './dto/upsert-override.dto.js'

@Injectable()
export class OverridesService {
  constructor(private readonly repo: OverridesRepository) {}

  async getByOrg(organisationId: string, tenantId: string) {
    const override = await this.repo.findByOrg(organisationId, tenantId)
    return { data: override ?? null }
  }

  async upsert(tenantId: string, dto: UpsertOverrideDto) {
    const existing = await this.repo.findOwner(dto.organisationId)
    if (existing && existing.tenantId !== tenantId) {
      throw new ForbiddenException(`Organisation '${dto.organisationId}' does not belong to this tenant`)
    }
    const result = await this.repo.upsert(tenantId, dto)
    return { data: result }
  }

  async remove(organisationId: string, tenantId: string) {
    await this.repo.delete(organisationId, tenantId)
    return { data: null }
  }
}
