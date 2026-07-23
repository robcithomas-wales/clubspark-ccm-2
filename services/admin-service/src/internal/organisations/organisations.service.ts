import { Injectable } from '@nestjs/common'
import { OrganisationsRepository } from './organisations.repository.js'
import type { CreateOrganisationDto } from './dto/create-organisation.dto.js'
import type { UpdateOrganisationDto } from './dto/update-organisation.dto.js'

@Injectable()
export class OrganisationsService {
  constructor(private readonly repo: OrganisationsRepository) {}

  list(
    page: number,
    limit: number,
    opts: { search?: string; status?: string; plan?: string; region?: string },
  ) {
    return this.repo.findMany({ ...opts, limit, offset: (page - 1) * limit })
  }

  async getDetail(tenantId: string) {
    const [org, adminCount] = await Promise.all([
      this.repo.findByTenantId(tenantId),
      this.repo.getAdminUserCount(tenantId),
    ])
    return { ...org, adminCount }
  }

  create(dto: CreateOrganisationDto) {
    return this.repo.create(dto)
  }

  sync(dto: CreateOrganisationDto) {
    return this.repo.upsert(dto)
  }

  update(tenantId: string, dto: UpdateOrganisationDto) {
    return this.repo.update(tenantId, dto)
  }
}
