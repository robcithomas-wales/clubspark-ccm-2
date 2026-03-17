import { Injectable, NotFoundException } from '@nestjs/common'
import { MembershipPlansRepository } from './membership-plans.repository'
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto'
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto'

@Injectable()
export class MembershipPlansService {
  constructor(private readonly repo: MembershipPlansRepository) {}

  async list(
    tenantId: string,
    organisationId: string,
    query: { schemeId?: string; status?: string; search?: string; limit?: number; offset?: number },
  ) {
    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = Number(query.offset) || 0

    const { rows, total } = await this.repo.list({
      tenantId,
      organisationId,
      schemeId: query.schemeId ?? null,
      status: query.status ?? null,
      search: query.search ?? null,
      limit,
      offset,
    })

    return { data: rows, pagination: { total, limit, offset } }
  }

  async getById(tenantId: string, organisationId: string, id: string) {
    const plan = await this.repo.findById(tenantId, organisationId, id)
    if (!plan) throw new NotFoundException('Membership plan not found')
    return { data: plan }
  }

  async create(tenantId: string, organisationId: string, dto: CreateMembershipPlanDto) {
    const plan = await this.repo.create({
      tenantId,
      organisationId,
      schemeId: dto.schemeId,
      name: dto.name,
      code: dto.code ?? null,
      description: dto.description ?? null,
      ownershipType: dto.ownershipType ?? null,
      durationType: dto.durationType ?? null,
      visibility: dto.visibility ?? null,
      status: dto.status ?? 'active',
      sortOrder: dto.sortOrder ?? null,
    })
    return { data: plan }
  }

  async update(
    tenantId: string,
    organisationId: string,
    id: string,
    dto: UpdateMembershipPlanDto,
  ) {
    const plan = await this.repo.update({ tenantId, organisationId, id, ...dto })
    if (!plan) throw new NotFoundException('Membership plan not found')
    return { data: plan }
  }
}
