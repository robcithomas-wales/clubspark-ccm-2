import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpsertWorkCardDto } from './dto/upsert-work-card.dto.js'

@Injectable()
export class WorkCardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, sport?: string) {
    return this.prisma.workCard.findMany({
      where: { tenantId, ...(sport ? { sport } : {}) },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findByPerson(tenantId: string, personId: string, sport?: string) {
    return this.prisma.workCard.findMany({
      where: { tenantId, personId, ...(sport ? { sport } : {}) },
    })
  }

  async upsert(tenantId: string, dto: UpsertWorkCardDto) {
    const sport = dto.sport ?? 'tennis'
    return this.prisma.workCard.upsert({
      where: { tenantId_personId_sport: { tenantId, personId: dto.personId, sport } },
      create: {
        tenantId,
        personId: dto.personId,
        sport,
        grade: dto.grade ?? null,
        category: dto.category ?? null,
        playingLevel: dto.playingLevel ?? null,
        ntrp: dto.ntrp ?? null,
        utr: dto.utr ?? null,
        ltaRating: dto.ltaRating ?? null,
        eligibleFrom: dto.eligibleFrom ? new Date(dto.eligibleFrom) : null,
        eligibleTo: dto.eligibleTo ? new Date(dto.eligibleTo) : null,
        externalRef: dto.externalRef ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        grade: dto.grade ?? null,
        category: dto.category ?? null,
        playingLevel: dto.playingLevel ?? null,
        ntrp: dto.ntrp ?? null,
        utr: dto.utr ?? null,
        ltaRating: dto.ltaRating ?? null,
        eligibleFrom: dto.eligibleFrom ? new Date(dto.eligibleFrom) : null,
        eligibleTo: dto.eligibleTo ? new Date(dto.eligibleTo) : null,
        externalRef: dto.externalRef ?? null,
        notes: dto.notes ?? null,
      },
    })
  }

  async delete(tenantId: string, personId: string, sport: string) {
    return this.prisma.workCard.deleteMany({ where: { tenantId, personId, sport } })
  }
}
