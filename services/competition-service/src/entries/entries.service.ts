import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { EntriesRepository } from './entries.repository.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateEntryDto } from './dto/create-entry.dto.js'
import type { UpdateEntryDto } from './dto/update-entry.dto.js'

@Injectable()
export class EntriesService {
  constructor(
    private readonly repo: EntriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(tenantId: string, competitionId: string, divisionId?: string) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    return { data: await this.repo.list(competitionId, divisionId) }
  }

  async create(tenantId: string, competitionId: string, dto: CreateEntryDto) {
    if (!dto.personId && !dto.teamId) throw new BadRequestException('Either personId or teamId is required')

    // Load the competition tenant-scoped: this both authorises the write and lets us
    // determine if this is a late entry (after registrationClosesAt but within lateEntryClosesAt)
    const competition = await this.prisma.competition.findFirst({ where: { id: competitionId, tenantId } })
    if (!competition) throw new NotFoundException('Competition not found')
    const now = new Date()
    const isLateEntry = Boolean(
      competition?.registrationClosesAt &&
      now > competition.registrationClosesAt &&
      competition.lateEntryClosesAt &&
      now <= competition.lateEntryClosesAt,
    )

    const entry = await this.repo.create(competitionId, { ...dto, isLateEntry } as any)
    return { data: entry }
  }

  async update(tenantId: string, competitionId: string, id: string, dto: UpdateEntryDto) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    const existing = await this.repo.findById(id, competitionId)
    if (!existing) throw new NotFoundException('Entry not found')
    const entry = await this.repo.update(id, competitionId, dto)
    return { data: entry }
  }

  async bulkConfirm(tenantId: string, competitionId: string, divisionId: string) {
    await this.assertCompetitionInTenant(tenantId, competitionId)
    const result = await this.repo.bulkConfirm(competitionId, divisionId)
    return { confirmed: result.count }
  }

  /**
   * Loads the competition scoped to the caller's tenant. Nested entry resources carry no
   * tenant_id of their own, so this is the tenant boundary and must run before any read/write.
   */
  private async assertCompetitionInTenant(tenantId: string, competitionId: string): Promise<void> {
    const competition = await this.prisma.competition.findFirst({ where: { id: competitionId, tenantId } })
    if (!competition) throw new NotFoundException('Competition not found')
  }
}
