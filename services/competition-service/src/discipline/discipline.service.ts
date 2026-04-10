import { Injectable, NotFoundException } from '@nestjs/common'
import { DisciplineRepository } from './discipline.repository.js'
import { AuditService } from '../audit/audit.service.js'
import type { CreateDisciplineCaseDto } from './dto/create-case.dto.js'
import type { CreateDisciplineActionDto } from './dto/create-action.dto.js'
import type { UpdateDisciplineCaseDto } from './dto/update-case.dto.js'

@Injectable()
export class DisciplineService {
  constructor(
    private readonly repo: DisciplineRepository,
    private readonly audit: AuditService,
  ) {}

  async listCases(tenantId: string, competitionId?: string, personId?: string) {
    return { data: await this.repo.listCases(tenantId, competitionId, personId) }
  }

  async getCase(tenantId: string, id: string) {
    const c = await this.repo.findCase(id, tenantId)
    if (!c) throw new NotFoundException('Discipline case not found')
    return { data: c }
  }

  async createCase(tenantId: string, actorId: string | undefined, dto: CreateDisciplineCaseDto) {
    const c = await this.repo.createCase(tenantId, actorId, dto)
    await this.audit.log({
      tenantId, entityType: 'discipline_case', entityId: c.id,
      action: 'created', actorId,
      after: { status: c.status, displayName: c.displayName },
    })
    return { data: c }
  }

  async updateCase(tenantId: string, id: string, actorId: string | undefined, dto: UpdateDisciplineCaseDto) {
    const existing = await this.repo.findCase(id, tenantId)
    if (!existing) throw new NotFoundException('Discipline case not found')
    const c = await this.repo.updateCase(id, tenantId, actorId, dto)
    await this.audit.log({
      tenantId, entityType: 'discipline_case', entityId: id,
      action: 'updated', actorId,
      before: { status: existing.status },
      after: { status: c.status },
    })
    return { data: c }
  }

  async addAction(tenantId: string, caseId: string, actorId: string | undefined, dto: CreateDisciplineActionDto) {
    const existing = await this.repo.findCase(caseId, tenantId)
    if (!existing) throw new NotFoundException('Discipline case not found')
    const action = await this.repo.addAction(caseId, actorId, dto)
    await this.audit.log({
      tenantId, entityType: 'discipline_case', entityId: caseId,
      action: 'action_added', actorId,
      after: { outcome: action.outcome, banMatches: action.banMatches },
    })
    return { data: action }
  }
}
