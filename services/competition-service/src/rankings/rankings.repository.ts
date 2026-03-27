import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateRankingConfigDto } from './dto/create-ranking-config.dto.js'
import type { UpdateRankingConfigDto } from './dto/update-ranking-config.dto.js'

@Injectable()
export class RankingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Configs ────────────────────────────────────────────────────────────────

  async createConfig(tenantId: string, dto: CreateRankingConfigDto) {
    return this.prisma.rankingConfig.create({
      data: {
        tenantId,
        sport: dto.sport,
        scope: dto.scope as any,
        algorithm: dto.algorithm as any,
        season: dto.season ?? null,
        pointsPerWin: dto.pointsPerWin ?? 3,
      },
      include: { _count: { select: { entries: true } } },
    })
  }

  async listConfigs(tenantId: string, sport?: string) {
    return this.prisma.rankingConfig.findMany({
      where: { tenantId, ...(sport ? { sport } : {}) },
      orderBy: [{ sport: 'asc' }, { scope: 'asc' }],
      include: { _count: { select: { entries: true } } },
    })
  }

  async findConfig(id: string, tenantId: string) {
    return this.prisma.rankingConfig.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { entries: true } } },
    })
  }

  async updateConfig(id: string, dto: UpdateRankingConfigDto) {
    return this.prisma.rankingConfig.update({
      where: { id },
      data: {
        ...(dto.algorithm !== undefined ? { algorithm: dto.algorithm as any } : {}),
        ...(dto.scope !== undefined ? { scope: dto.scope as any } : {}),
        ...(dto.season !== undefined ? { season: dto.season } : {}),
        ...(dto.pointsPerWin !== undefined ? { pointsPerWin: dto.pointsPerWin } : {}),
      },
    })
  }

  async deleteConfig(id: string) {
    return this.prisma.rankingConfig.delete({ where: { id } })
  }

  // ── Entries (leaderboard) ──────────────────────────────────────────────────

  async getLeaderboard(configId: string, limit = 50, offset = 0) {
    const [entries, total] = await Promise.all([
      this.prisma.rankingEntry.findMany({
        where: { configId },
        orderBy: [{ rank: 'asc' }, { eloRating: 'desc' }, { points: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.rankingEntry.count({ where: { configId } }),
    ])
    return { entries, total }
  }

  async findOrCreateEntry(configId: string, tenantId: string, sport: string, data: {
    personId?: string | null
    teamId?: string | null
    displayName: string
  }) {
    const where = data.personId
      ? { configId_personId: { configId, personId: data.personId } }
      : { configId_teamId: { configId, teamId: data.teamId! } }

    const existing = await (data.personId
      ? this.prisma.rankingEntry.findUnique({ where: { configId_personId: { configId, personId: data.personId } } })
      : this.prisma.rankingEntry.findUnique({ where: { configId_teamId: { configId, teamId: data.teamId! } } }))

    if (existing) return existing

    return this.prisma.rankingEntry.create({
      data: {
        configId,
        tenantId,
        sport,
        personId: data.personId ?? null,
        teamId: data.teamId ?? null,
        displayName: data.displayName,
      },
    })
  }

  async updateEntry(id: string, data: Partial<{
    eloRating: number
    eloProvisional: boolean
    matchesPlayed: number
    wins: number
    draws: number
    losses: number
    points: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    lastMatchAt: Date
  }>) {
    return this.prisma.rankingEntry.update({ where: { id }, data })
  }

  async reRankAll(configId: string, algorithm: string) {
    const entries = await this.prisma.rankingEntry.findMany({
      where: { configId },
      orderBy: algorithm === 'ELO'
        ? [{ eloRating: 'desc' }, { matchesPlayed: 'desc' }]
        : [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
    })
    for (let i = 0; i < entries.length; i++) {
      const prev = entries[i]!.rank
      const newRank = i + 1
      await this.prisma.rankingEntry.update({
        where: { id: entries[i]!.id },
        data: { previousRank: prev, rank: newRank, rankChange: prev != null ? prev - newRank : null },
      })
    }
  }

  async createMatchEvent(data: {
    configId: string
    matchId: string
    entryId: string
    opponentEntryId?: string | null
    ratingBefore?: number | null
    ratingAfter?: number | null
    ratingChange?: number | null
    pointsAwarded?: number | null
    outcome: string
  }) {
    return this.prisma.rankingMatchEvent.create({ data })
  }

  async listMatchEvents(configId: string, entryId: string) {
    return this.prisma.rankingMatchEvent.findMany({
      where: { configId, entryId },
      orderBy: { processedAt: 'desc' },
      take: 20,
    })
  }

  async findConfigsByTenantAndSport(tenantId: string, sport: string) {
    return this.prisma.rankingConfig.findMany({
      where: { tenantId, sport },
    })
  }
}
