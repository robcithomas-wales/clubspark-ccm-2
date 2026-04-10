import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SubmissionsRepository } from './submissions.repository.js'
import { AuditService } from '../audit/audit.service.js'
import type { CreateSubmissionDto, UpdateSubmissionDto } from './dto/create-submission.dto.js'

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly repo: SubmissionsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, competitionId?: string) {
    return { data: await this.repo.list(tenantId, competitionId) }
  }

  async findById(tenantId: string, id: string) {
    const s = await this.repo.findById(id, tenantId)
    if (!s) throw new NotFoundException('Submission not found')
    return { data: s }
  }

  async submit(tenantId: string, actorId: string | undefined, dto: CreateSubmissionDto) {
    const submission = await this.repo.create(tenantId, actorId, dto.competitionId, dto.governingBody)
    await this.audit.log({
      tenantId, entityType: 'tournament_submission', entityId: submission.id,
      action: 'submitted', actorId,
      after: { competitionId: submission.competitionId, governingBody: submission.governingBody },
    })
    return { data: submission }
  }

  async acknowledge(tenantId: string, id: string, actorId: string | undefined, dto: UpdateSubmissionDto) {
    const existing = await this.repo.findById(id, tenantId)
    if (!existing) throw new NotFoundException('Submission not found')
    if (existing.status !== 'SUBMITTED') throw new BadRequestException('Submission is not in SUBMITTED state')
    const updated = await this.repo.acknowledge(id, dto.externalRef, dto.responseData)
    await this.audit.log({
      tenantId, entityType: 'tournament_submission', entityId: id,
      action: 'acknowledged', actorId,
      after: { externalRef: dto.externalRef },
    })
    return { data: updated }
  }

  async reject(tenantId: string, id: string, actorId: string | undefined, reason: string) {
    const existing = await this.repo.findById(id, tenantId)
    if (!existing) throw new NotFoundException('Submission not found')
    if (existing.status !== 'SUBMITTED') throw new BadRequestException('Submission is not in SUBMITTED state')
    const updated = await this.repo.reject(id, reason)
    await this.audit.log({
      tenantId, entityType: 'tournament_submission', entityId: id,
      action: 'rejected', actorId,
      after: { reason },
    })
    return { data: updated }
  }
}
