import type { ICompetitionFormat, MatchData } from './format.interface.js'

/**
 * Swiss system draw generator — Round 1 only.
 * Round 1 pairs entries by seed: 1v2, 3v4, 5v6 etc.
 * Subsequent rounds are generated dynamically by a separate pairing step
 * (players are paired by score similarity after each round completes).
 * This generates only the Round 1 fixtures; the service must call
 * generateNextSwissRound() to produce subsequent pairings.
 */
export class SwissFormat implements ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    const sorted = [...entries].sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999))
    const matches: MatchData[] = []
    let matchNumber = 1

    for (let i = 0; i < sorted.length - 1; i += 2) {
      const home = sorted[i]!
      const away = sorted[i + 1]!
      matches.push({
        round: 1,
        matchNumber: matchNumber++,
        homeEntryId: home.id,
        awayEntryId: away.id,
        status: 'SCHEDULED',
      })
    }

    // Odd number of entries: last player gets a bye in Round 1
    if (sorted.length % 2 !== 0) {
      const byeEntry = sorted[sorted.length - 1]!
      matches.push({
        round: 1,
        matchNumber: matchNumber++,
        homeEntryId: byeEntry.id,
        awayEntryId: null,
        status: 'BYE',
      })
    }

    return matches
  }

  /**
   * Generates pairings for the next Swiss round based on current standings.
   * Entries are sorted by points descending, then paired top-down.
   * Already-played pairings are avoided where possible.
   */
  generateNextRound(
    round: number,
    standings: { entryId: string; points: number }[],
    playedPairs: Set<string>,
  ): MatchData[] {
    const sorted = [...standings].sort((a, b) => b.points - a.points)
    const paired = new Set<string>()
    const matches: MatchData[] = []
    let matchNumber = 1

    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]!
      if (paired.has(a.entryId)) continue

      // Find the nearest unpaired opponent not yet played against
      let opponentIndex = -1
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j]!
        if (paired.has(b.entryId)) continue
        const key = [a.entryId, b.entryId].sort().join(':')
        if (!playedPairs.has(key)) {
          opponentIndex = j
          break
        }
      }

      if (opponentIndex === -1) {
        // All remaining opponents already played — give bye
        matches.push({ round, matchNumber: matchNumber++, homeEntryId: a.entryId, awayEntryId: null, status: 'BYE' })
        paired.add(a.entryId)
      } else {
        const b = sorted[opponentIndex]!
        matches.push({ round, matchNumber: matchNumber++, homeEntryId: a.entryId, awayEntryId: b.entryId, status: 'SCHEDULED' })
        paired.add(a.entryId)
        paired.add(b.entryId)
      }
    }

    return matches
  }
}
