import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { getSportConfig } from '../sports/sport-config.js'

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(competitionId: string, divisionId: string) {
    const standings = await this.prisma.standing.findMany({
      where: { competitionId, divisionId },
      orderBy: { position: 'asc' },
      include: { entry: true },
    })
    return { data: standings }
  }

  /**
   * Recalculate all standings for a division from verified matches.
   * Called automatically when a result is verified.
   */
  async recalculate(competitionId: string, divisionId: string): Promise<void> {
    const [competition, matches, entries] = await Promise.all([
      this.prisma.competition.findFirst({ where: { id: competitionId } }),
      this.prisma.match.findMany({
        where: { competitionId, divisionId, status: 'COMPLETED', resultStatus: 'VERIFIED' },
      }),
      this.prisma.entry.findMany({
        where: { divisionId, status: 'CONFIRMED' },
      }),
    ])

    if (!competition) return

    const sportCfg = getSportConfig(competition.sport)
    const mp = sportCfg.matchPoints

    type Stats = { played: number; won: number; drawn: number; lost: number; pf: number; pa: number; pts: number }
    const stats = new Map<string, Stats>()
    for (const e of entries) {
      stats.set(e.id, { played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, pts: 0 })
    }

    for (const m of matches) {
      if (!m.homeEntryId || !m.awayEntryId) continue
      const hs = stats.get(m.homeEntryId)
      const as_ = stats.get(m.awayEntryId)
      if (!hs || !as_) continue

      hs.played++; as_.played++
      const hPts = Number(m.homePoints ?? 0)
      const aPts = Number(m.awayPoints ?? 0)
      hs.pf += hPts; hs.pa += aPts
      as_.pf += aPts; as_.pa += hPts

      if (m.winnerId === m.homeEntryId) {
        hs.won++; hs.pts += mp.win; as_.lost++; as_.pts += mp.loss
      } else if (m.winnerId === m.awayEntryId) {
        as_.won++; as_.pts += mp.win; hs.lost++; hs.pts += mp.loss
      } else {
        hs.drawn++; hs.pts += mp.draw; as_.drawn++; as_.pts += mp.draw
      }
    }

    // Sort by points then by tiebreak rules
    const tiebreaks = (competition.tiebreakRules as string[] | null) ?? sportCfg.defaultTiebreaks
    const sorted = [...entries].sort((a, b) => {
      const sa = stats.get(a.id)!
      const sb = stats.get(b.id)!
      if (sb.pts !== sa.pts) return sb.pts - sa.pts
      for (const rule of tiebreaks) {
        let diff = 0
        if (rule === 'goal_difference' || rule === 'points_difference' || rule === 'games_won') {
          diff = (sb.pf - sb.pa) - (sa.pf - sa.pa)
        } else if (rule === 'goals_for' || rule === 'points_for' || rule === 'sets_won') {
          diff = sb.pf - sa.pf
        } else if (rule === 'head_to_head') {
          const h2h = matches.find(m =>
            m.status === 'COMPLETED' && m.resultStatus === 'VERIFIED' &&
            ((m.homeEntryId === a.id && m.awayEntryId === b.id) || (m.homeEntryId === b.id && m.awayEntryId === a.id))
          )
          if (h2h?.winnerId === b.id) diff = 1
          else if (h2h?.winnerId === a.id) diff = -1
        }
        if (diff !== 0) return diff
      }
      return 0
    })

    // Upsert standings
    for (let i = 0; i < sorted.length; i++) {
      const entryId = sorted[i]!.id
      const s = stats.get(entryId)!
      await this.prisma.standing.upsert({
        where: { divisionId_entryId: { divisionId, entryId } },
        create: {
          competitionId, divisionId, entryId,
          played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
          pointsFor: s.pf, pointsAgainst: s.pa, pointsDifference: s.pf - s.pa,
          points: s.pts, position: i + 1,
        },
        update: {
          previousPosition: undefined, // keep previous
          played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
          pointsFor: s.pf, pointsAgainst: s.pa, pointsDifference: s.pf - s.pa,
          points: s.pts, position: i + 1,
        },
      })
    }
  }
}
