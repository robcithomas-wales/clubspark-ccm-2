import { Injectable, NotFoundException } from '@nestjs/common'
import { MembershipSchemesRepository } from './membership-schemes.repository'
import { CreateMembershipSchemeDto } from './dto/create-membership-scheme.dto'
import { UpdateMembershipSchemeDto } from './dto/update-membership-scheme.dto'

@Injectable()
export class MembershipSchemesService {
  constructor(private readonly repo: MembershipSchemesRepository) {}

  async list(
    tenantId: string,
    organisationId: string,
    query: { status?: string; search?: string; limit?: number; offset?: number },
  ) {
    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = Number(query.offset) || 0

    const { rows, total } = await this.repo.list({
      tenantId,
      organisationId,
      status: query.status ?? null,
      search: query.search ?? null,
      limit,
      offset,
    })

    return {
      data: rows,
      pagination: { total, limit, offset },
    }
  }

  async getById(tenantId: string, organisationId: string, id: string) {
    const scheme = await this.repo.findById(tenantId, organisationId, id)
    if (!scheme) throw new NotFoundException('Membership scheme not found')
    return { data: scheme }
  }

  async create(tenantId: string, organisationId: string, dto: CreateMembershipSchemeDto) {
    const scheme = await this.repo.create({
      tenantId,
      organisationId,
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    })
    return { data: scheme }
  }

  async update(
    tenantId: string,
    organisationId: string,
    id: string,
    dto: UpdateMembershipSchemeDto,
  ) {
    const scheme = await this.repo.update({
      tenantId,
      organisationId,
      id,
      name: dto.name,
      description: dto.description,
      status: dto.status,
    })
    if (!scheme) throw new NotFoundException('Membership scheme not found')
    return { data: scheme }
  }
}
