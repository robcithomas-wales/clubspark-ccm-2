import { Injectable, BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { LeagueFormat } from './formats/league.format.js'
import { KnockoutFormat } from './formats/knockout.format.js'
import { RoundRobinFormat } from './formats/round-robin.format.js'
import { SwissFormat } from './formats/swiss.format.js'
import { GroupKnockoutFormat } from './formats/group-knockout.format.js'
import { LadderFormat } from './formats/ladder.format.js'
import type { ICompetitionFormat } from './formats/format.interface.js'

@Injectable()
export class DrawService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDraw(tenantId: string, competitionId: string, divisionId: string): Promise<{ matchesCreated: number }> {
    const competition = await this.prisma.competition.findFirst({
      where: { id: competitionId, tenantId },
    })
    if (!competition) throw new BadRequestException('Competition not found')

    const division = await this.prisma.division.findFirst({
      where: { id: divisionId, competitionId },
    })
    if (!division) throw new BadRequestException('Division not found')

    // Check no matches already exist
    const existing = await this.prisma.match.count({ where: { divisionId } })
    if (existing > 0) throw new ConflictException('Draw already generated for this division')

    const confirmedEntries = await this.prisma.entry.findMany({
      where: { divisionId, status: 'CONFIRMED' },
      orderBy: [{ seed: 'asc' }, { createdAt: 'asc' }],
    })

    if (confirmedEntries.length < 2) {
      throw new BadRequestException('At least 2 confirmed entries are required to generate a draw')
    }

    const format = division.format ?? competition.format
    const strategy = this.getFormatStrategy(format)
    const matchData = strategy.generateDraw(confirmedEntries.map(e => ({ id: e.id, seed: e.seed })))

    if (matchData.length === 0) throw new BadRequestException('Draw generation produced no matches')

    await this.prisma.match.createMany({
      data: matchData.map(m => ({
        competitionId,
        divisionId,
        round: m.round,
        matchNumber: m.matchNumber,
        homeEntryId: m.homeEntryId,
        awayEntryId: m.awayEntryId,
        status: m.status,
      })),
    })

    // Initialise standings for all confirmed entries
    await this.prisma.standing.createMany({
      data: confirmedEntries.map((e, i) => ({
        competitionId,
        divisionId,
        entryId: e.id,
        position: i + 1,
      })),
      skipDuplicates: true,
    })

    return { matchesCreated: matchData.length }
  }

  async resetDraw(tenantId: string, competitionId: string, divisionId: string): Promise<void> {
    const competition = await this.prisma.competition.findFirst({
      where: { id: competitionId, tenantId },
    })
    if (!competition) throw new BadRequestException('Competition not found')

    await this.prisma.$transaction([
      this.prisma.match.deleteMany({ where: { divisionId, competitionId } }),
      this.prisma.standing.deleteMany({ where: { divisionId, competitionId } }),
    ])
  }

  private getFormatStrategy(format: string): ICompetitionFormat {
    switch (format) {
      case 'LEAGUE':          return new LeagueFormat()
      case 'KNOCKOUT':        return new KnockoutFormat()
      case 'ROUND_ROBIN':     return new RoundRobinFormat()
      case 'SWISS':           return new SwissFormat()
      case 'GROUP_KNOCKOUT':  return new GroupKnockoutFormat()
      case 'LADDER':          return new LadderFormat()
      default:                return new LeagueFormat()
    }
  }

  /**
   * Generates the next round of matches for a SWISS format division.
   * Called after all matches in the current round are completed.
   */
  async generateNextSwissRound(tenantId: string, competitionId: string, divisionId: string): Promise<{ matchesCreated: number }> {
    const competition = await this.prisma.competition.findFirst({ where: { id: competitionId, tenantId } })
    if (!competition) throw new BadRequestException('Competition not found')

    const division = await this.prisma.division.findFirst({ where: { id: divisionId, competitionId } })
    if (!division) throw new BadRequestException('Division not found')

    const format = division.format ?? competition.format
    if (format !== 'SWISS') throw new BadRequestException('Not a SWISS format division')

    // Determine current round
    const lastRound = await this.prisma.match.aggregate({
      where: { divisionId, competitionId },
      _max: { round: true },
    })
    const currentRound = (lastRound._max.round ?? 0) + 1

    // Load standings for pairing
    const standings = await this.prisma.standing.findMany({
      where: { divisionId },
      select: { entryId: true, points: true },
    })

    // Build set of already-played pairs
    const playedMatches = await this.prisma.match.findMany({
      where: { divisionId, status: { not: 'BYE' } },
      select: { homeEntryId: true, awayEntryId: true },
    })
    const playedPairs = new Set(
      playedMatches
        .filter(m => m.homeEntryId && m.awayEntryId)
        .map(m => [m.homeEntryId, m.awayEntryId].sort().join(':'))
    )

    const swiss = new SwissFormat()
    const matchData = swiss.generateNextRound(
      currentRound,
      standings.map(s => ({ entryId: s.entryId, points: Number(s.points) })),
      playedPairs,
    )

    if (matchData.length === 0) throw new BadRequestException('No valid pairings available for next round')

    await this.prisma.match.createMany({
      data: matchData.map(m => ({
        competitionId,
        divisionId,
        round: m.round,
        matchNumber: m.matchNumber,
        homeEntryId: m.homeEntryId,
        awayEntryId: m.awayEntryId,
        status: m.status,
      })),
    })

    return { matchesCreated: matchData.length }
  }
}
