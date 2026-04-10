import { Injectable } from '@nestjs/common'
import { WorkCardsRepository } from './work-cards.repository.js'
import { AuditService } from '../audit/audit.service.js'
import type { UpsertWorkCardDto } from './dto/upsert-work-card.dto.js'

@Injectable()
export class WorkCardsService {
  constructor(
    private readonly repo: WorkCardsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, sport?: string) {
    return { data: await this.repo.list(tenantId, sport) }
  }

  async listForPerson(tenantId: string, personId: string, sport?: string) {
    return { data: await this.repo.findByPerson(tenantId, personId, sport) }
  }

  async upsert(tenantId: string, actorId: string | undefined, dto: UpsertWorkCardDto) {
    const card = await this.repo.upsert(tenantId, dto)
    await this.audit.log({
      tenantId, entityType: 'work_card', entityId: card.id,
      action: 'upserted', actorId,
      after: { personId: card.personId, sport: card.sport, grade: card.grade, ltaRating: card.ltaRating },
    })
    return { data: card }
  }

  async delete(tenantId: string, actorId: string | undefined, personId: string, sport: string) {
    await this.repo.delete(tenantId, personId, sport)
    await this.audit.log({
      tenantId, entityType: 'work_card', entityId: `${personId}:${sport}`,
      action: 'deleted', actorId,
    })
  }
}
