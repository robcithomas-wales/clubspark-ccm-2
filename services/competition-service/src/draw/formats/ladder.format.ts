import type { ICompetitionFormat, MatchData } from './format.interface.js'

/**
 * Box League / Ladder format.
 *
 * Players are arranged in a ranked list. Any player can challenge the player
 * immediately above them (or within a configurable number of rungs).
 *
 * This generator creates the initial ladder ordering as pseudo-matches
 * (SCHEDULED status with null opponents) — one "match slot" per participant
 * representing their ladder position. Actual challenges are booked separately
 * via the matches endpoint with a ladder-specific flow.
 *
 * In practice, a Ladder competition does not pre-generate all fixtures —
 * instead individual challenge matches are created on demand. The draw
 * generation here creates the initial ranking positions.
 */
export class LadderFormat implements ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    // Sort by seed (or insertion order) to establish initial ladder positions
    const sorted = [...entries].sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999))

    // Generate challenge slots between adjacent pairs (position vs position+1)
    // These serve as the initial valid challenge pairings
    const matches: MatchData[] = []
    let matchNumber = 1

    for (let i = 0; i < sorted.length - 1; i++) {
      const challenger = sorted[i + 1]!  // lower ranked challenges higher ranked
      const defender   = sorted[i]!
      matches.push({
        round: 1,
        matchNumber: matchNumber++,
        homeEntryId: defender.id,
        awayEntryId: challenger.id,
        status: 'SCHEDULED',
      })
    }

    return matches
  }
}
