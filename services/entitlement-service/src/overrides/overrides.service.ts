import { Injectable } from '@nestjs/common'
import { OverridesRepository } from './overrides.repository.js'
import type { UpsertOverrideDto } from './dto/upsert-override.dto.js'

@Injectable()
export class OverridesService {
  constructor(private readonly repo: OverridesRepository) {}

  async getByOrg(organisationId: string) {
    const override = await this.repo.findByOrg(organisationId)
    return { data: override ?? null }
  }

  async upsert(tenantId: string, dto: UpsertOverrideDto) {
    const result = await this.repo.upsert(tenantId, dto)
    return { data: result }
  }

  async remove(organisationId: string) {
    await this.repo.delete(organisationId)
    return { data: null }
  }
}
