import type { ICompetitionFormat, MatchData } from './format.interface.js'

/**
 * Round-robin league scheduler using the circle method (Berger tables).
 * Odd number of entries: a BYE is added and BYE matches are skipped.
 * For N entries: N-1 rounds (N even) or N rounds (N odd), each with floor(N/2) matches.
 */
export class LeagueFormat implements ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    if (entries.length < 2) return []

    const ids = entries.map(e => e.id)
    // Add BYE placeholder for odd numbers
    if (ids.length % 2 !== 0) ids.push('__BYE__')

    const n = ids.length
    const fixed = ids[0]
    const rotate = ids.slice(1)
    const matches: MatchData[] = []
    let matchCounter = 1

    for (let r = 0; r < n - 1; r++) {
      const current = [fixed, ...rotate]
      for (let i = 0; i < n / 2; i++) {
        const home = current[i]
        const away = current[n - 1 - i]
        if (home === '__BYE__' || away === '__BYE__') continue
        matches.push({
          round: r + 1,
          matchNumber: matchCounter++,
          homeEntryId: home,
          awayEntryId: away,
          status: 'SCHEDULED',
        })
      }
      // Rotate: move last element to front of the rotating segment
      rotate.unshift(rotate.pop()!)
    }

    return matches
  }
}
