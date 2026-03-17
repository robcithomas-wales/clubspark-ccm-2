import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { MembershipsRepository } from './memberships.repository'
import { MembershipPlansRepository } from '../membership-plans/membership-plans.repository'
import { CreateMembershipDto } from './dto/create-membership.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'

@Injectable()
export class MembershipsService {
  constructor(
    private readonly repo: MembershipsRepository,
    private readonly plansRepo: MembershipPlansRepository,
  ) {}

  async list(
    tenantId: string,
    organisationId: string,
    query: {
      planId?: string
      status?: string
      customerId?: string
      ownerType?: string
      ownerId?: string
      search?: string
      limit?: number
      offset?: number
    },
  ) {
    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = Number(query.offset) || 0

    const { rows, total } = await this.repo.list({
      tenantId,
      organisationId,
      planId: query.planId ?? null,
      status: query.status ?? null,
      customerId: query.customerId ?? null,
      ownerType: query.ownerType ?? null,
      ownerId: query.ownerId ?? null,
      search: query.search ?? null,
      limit,
      offset,
    })

    return { data: rows, pagination: { total, limit, offset } }
  }

  async getById(tenantId: string, organisationId: string, id: string) {
    const m = await this.repo.findById(tenantId, organisationId, id)
    if (!m) throw new NotFoundException('Membership not found')
    return { data: m }
  }

  async create(tenantId: string, organisationId: string, dto: CreateMembershipDto) {
    if (!dto.planId) throw new BadRequestException('planId is required')
    if (!dto.startDate) throw new BadRequestException('startDate is required')
    if (!dto.customerId && !dto.householdId) {
      throw new BadRequestException('customerId or householdId is required')
    }

    const plan = await this.plansRepo.findById(tenantId, organisationId, dto.planId)
    if (!plan) throw new NotFoundException('Membership plan not found')

    let ownerType: string | null = null
    let ownerId: string | null = null

    if (plan.ownershipType === 'person') {
      if (!dto.customerId) throw new BadRequestException('customerId is required for person plans')
      ownerType = 'person'
      ownerId = dto.customerId
    } else if (plan.ownershipType === 'household') {
      if (!dto.householdId) throw new BadRequestException('householdId is required for household plans')
      ownerType = 'household'
      ownerId = dto.householdId
    }

    const m = await this.repo.create({
      tenantId,
      organisationId,
      planId: dto.planId,
      customerId: dto.customerId ?? null,
      ownerType,
      ownerId,
      status: dto.status ?? 'active',
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      renewalDate: dto.renewalDate ?? null,
      autoRenew: dto.autoRenew === true,
      paymentStatus: dto.paymentStatus ?? 'unpaid',
      reference: dto.reference?.trim() ?? null,
      source: dto.source?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
    })

    return { data: m }
  }

  async update(
    tenantId: string,
    organisationId: string,
    id: string,
    dto: UpdateMembershipDto,
  ) {
    const existing = await this.repo.findById(tenantId, organisationId, id)
    if (!existing) throw new NotFoundException('Membership not found')

    const planId = dto.planId ?? existing.planId
    const plan = await this.plansRepo.findById(tenantId, organisationId, planId)
    if (!plan) throw new NotFoundException('Membership plan not found')

    const customerId =
      dto.customerId !== undefined ? dto.customerId || null : existing.customerId
    const householdId =
      dto.householdId !== undefined ? dto.householdId || null : existing.householdId

    let ownerType = existing.ownerType
    let ownerId = existing.ownerId

    if (plan.ownershipType === 'person') {
      if (!customerId) throw new BadRequestException('customerId is required for person plans')
      ownerType = 'person'
      ownerId = customerId
    } else if (plan.ownershipType === 'household') {
      if (!householdId) throw new BadRequestException('householdId is required for household plans')
      ownerType = 'household'
      ownerId = householdId
    }

    const m = await this.repo.update(id, {
      planId,
      customerId,
      ownerType,
      ownerId,
      status: dto.status ?? existing.status,
      startDate: dto.startDate ?? existing.startDate,
      endDate: dto.endDate !== undefined ? dto.endDate || null : existing.endDate,
      renewalDate: dto.renewalDate !== undefined ? dto.renewalDate || null : existing.renewalDate,
      autoRenew: dto.autoRenew !== undefined ? dto.autoRenew === true : existing.autoRenew,
      paymentStatus: dto.paymentStatus ?? existing.paymentStatus,
      reference: dto.reference !== undefined ? dto.reference?.trim() || null : existing.reference,
      source: dto.source !== undefined ? dto.source?.trim() || null : existing.source,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
    })

    return { data: m }
  }

  async remove(tenantId: string, organisationId: string, id: string) {
    const existing = await this.repo.findById(tenantId, organisationId, id)
    if (!existing) throw new NotFoundException('Membership not found')
    await this.repo.delete(id)
  }
}
