import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateEntryDto } from './dto/create-entry.dto.js'
import type { UpdateEntryDto } from './dto/update-entry.dto.js'

@Injectable()
export class EntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(competitionId: string, divisionId?: string) {
    const where: any = { competitionId, ...(divisionId ? { divisionId } : {}) }
    return this.prisma.entry.findMany({ where, orderBy: [{ seed: 'asc' }, { displayName: 'asc' }] })
  }

  async findById(id: string, competitionId: string) {
    return this.prisma.entry.findFirst({ where: { id, competitionId } })
  }

  async create(competitionId: string, dto: CreateEntryDto) {
    return this.prisma.entry.create({
      data: {
        competitionId,
        divisionId: dto.divisionId ?? null,
        personId: dto.personId ?? null,
        teamId: dto.teamId ?? null,
        displayName: dto.displayName,
        seed: dto.seed ?? null,
        notes: dto.notes ?? null,
      },
    })
  }

  async update(id: string, competitionId: string, dto: UpdateEntryDto) {
    const data: any = {}
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.seed !== undefined) data.seed = dto.seed
    if (dto.status !== undefined) { data.status = dto.status; if (dto.status === 'WITHDRAWN') data.withdrawnAt = new Date() }
    if (dto.paymentStatus !== undefined) data.paymentStatus = dto.paymentStatus
    if (dto.withdrawnReason !== undefined) data.withdrawnReason = dto.withdrawnReason
    if (dto.divisionId !== undefined) data.divisionId = dto.divisionId
    await this.prisma.entry.updateMany({ where: { id, competitionId }, data })
    return this.findById(id, competitionId)
  }

  async bulkConfirm(competitionId: string, divisionId: string) {
    return this.prisma.entry.updateMany({
      where: { competitionId, divisionId, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    })
  }
}
