import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CompetitionsRepository } from './competitions.repository.js'
import { AuditService } from '../audit/audit.service.js'
import { getSportConfig } from '../sports/sport-config.js'
import type { CreateCompetitionDto } from './dto/create-competition.dto.js'
import type { UpdateCompetitionDto } from './dto/update-competition.dto.js'

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly repo: CompetitionsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, page: number, limit: number, filters: { status?: string; sport?: string }) {
    const { competitions, total } = await this.repo.list(tenantId, page, limit, filters)
    return {
      data: competitions.map(c => ({ ...c, sportConfig: getSportConfig(c.sport) })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async findById(tenantId: string, id: string) {
    const c = await this.repo.findById(tenantId, id)
    if (!c) throw new NotFoundException('Competition not found')
    return { data: { ...c, sportConfig: getSportConfig(c.sport) } }
  }

  async create(tenantId: string, organisationId: string | undefined, actorId: string | undefined, dto: CreateCompetitionDto) {
    const c = await this.repo.create(tenantId, organisationId, dto)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: c.id,
      action: 'created', actorId,
      after: { name: c.name, format: c.format, sport: c.sport, status: c.status },
    })
    return { data: c }
  }

  async update(tenantId: string, id: string, actorId: string | undefined, dto: UpdateCompetitionDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    const c = await this.repo.update(tenantId, id, dto)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: id,
      action: 'updated', actorId,
      before: { status: existing.status },
      after: { status: c?.status },
    })
    return { data: c }
  }

  async delete(tenantId: string, id: string, actorId: string | undefined) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    await this.repo.delete(tenantId, id)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: id,
      action: 'deleted', actorId,
      before: { name: existing.name, status: existing.status },
    })
  }

  async submitForApproval(tenantId: string, id: string, actorId: string | undefined) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    if (existing.status !== 'DRAFT') throw new BadRequestException('Only DRAFT competitions can be submitted for approval')
    const c = await this.repo.update(tenantId, id, { status: 'AWAITING_APPROVAL' } as any)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: id,
      action: 'submitted_for_approval', actorId,
      before: { status: 'DRAFT' }, after: { status: 'AWAITING_APPROVAL' },
    })
    return { data: c }
  }

  async approve(tenantId: string, id: string, actorId: string | undefined) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    if (existing.status !== 'AWAITING_APPROVAL') throw new BadRequestException('Competition is not awaiting approval')
    const c = await this.repo.update(tenantId, id, {
      status: 'REGISTRATION_OPEN',
      approvedBy: actorId,
      approvedAt: new Date().toISOString(),
    } as any)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: id,
      action: 'approved', actorId,
      before: { status: 'AWAITING_APPROVAL' }, after: { status: 'REGISTRATION_OPEN' },
    })
    return { data: c }
  }

  async reject(tenantId: string, id: string, actorId: string | undefined, reason: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    if (existing.status !== 'AWAITING_APPROVAL') throw new BadRequestException('Competition is not awaiting approval')
    const c = await this.repo.update(tenantId, id, {
      status: 'DRAFT',
      rejectedBy: actorId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    } as any)
    await this.audit.log({
      tenantId, entityType: 'competition', entityId: id,
      action: 'rejected', actorId,
      before: { status: 'AWAITING_APPROVAL' }, after: { status: 'DRAFT', reason },
    })
    return { data: c }
  }

  async getAuditLog(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Competition not found')
    const logs = await this.audit.listForEntity(tenantId, 'competition', id)
    return { data: logs }
  }
}
