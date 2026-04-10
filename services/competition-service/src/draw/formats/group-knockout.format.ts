import type { ICompetitionFormat, MatchData } from './format.interface.js'
import { RoundRobinFormat } from './round-robin.format.js'

/**
 * Group stage followed by a knockout phase.
 *
 * Behaviour:
 * - Entries are split into groups of ~4 (configurable via groupSize).
 * - Each group plays a round-robin within itself (all vs all, single leg).
 * - Knockout placeholder matches are created for the top N from each group.
 *
 * Round numbering:
 * - Rounds 1..N  = group stage (each round is a set of group matches)
 * - Round 100+   = knockout phase (100 = QF equivalent, 200 = SF, 300 = F)
 */
export class GroupKnockoutFormat implements ICompetitionFormat {
  private readonly groupSize: number
  private readonly qualifiersPerGroup: number

  constructor(groupSize = 4, qualifiersPerGroup = 2) {
    this.groupSize = groupSize
    this.qualifiersPerGroup = qualifiersPerGroup
  }

  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    const sorted = [...entries].sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999))
    const groups = this.splitIntoGroups(sorted)

    const matches: MatchData[] = []
    let matchNumber = 1

    // Group stage — round robin within each group
    const rr = new RoundRobinFormat()
    groups.forEach((group, groupIdx) => {
      const groupMatches = rr.generateDraw(group)
      groupMatches.forEach(m => {
        matches.push({
          round: m.round,            // 1, 2, 3... within group
          matchNumber: matchNumber++,
          homeEntryId: m.homeEntryId,
          awayEntryId: m.awayEntryId,
          status: m.status,
        })
      })
      // Annotate groupIdx is implicit via matchNumber continuity; the UI can
      // display groups by clustering matches by round and entry membership.
    })

    // Knockout phase — placeholder slots
    // Number of qualifiers = groups.length × qualifiersPerGroup
    const qualifiers = groups.length * this.qualifiersPerGroup
    const koRounds = this.knockoutRounds(qualifiers)
    let koMatchesInRound = Math.ceil(qualifiers / 2)
    let koRound = 100

    while (koMatchesInRound >= 1) {
      for (let i = 0; i < koMatchesInRound; i++) {
        matches.push({
          round: koRound,
          matchNumber: matchNumber++,
          homeEntryId: null,
          awayEntryId: null,
          status: 'SCHEDULED',
        })
      }
      koMatchesInRound = Math.floor(koMatchesInRound / 2)
      koRound += 100
    }

    return matches
  }

  private splitIntoGroups(entries: { id: string; seed?: number | null }[]): { id: string; seed?: number | null }[][] {
    // Seed-snake distribution: distribute top seeds across groups
    const numGroups = Math.ceil(entries.length / this.groupSize)
    const groups: { id: string; seed?: number | null }[][] = Array.from({ length: numGroups }, () => [])

    entries.forEach((entry, i) => {
      // Snake: 0,1,2,3,3,2,1,0,0,1,...
      const row = Math.floor(i / numGroups)
      const col = row % 2 === 0 ? i % numGroups : numGroups - 1 - (i % numGroups)
      groups[col]!.push(entry)
    })

    return groups
  }

  private knockoutRounds(n: number): number {
    let rounds = 0
    let m = n
    while (m > 1) {
      m = Math.ceil(m / 2)
      rounds++
    }
    return rounds
  }
}
