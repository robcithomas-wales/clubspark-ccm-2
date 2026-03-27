import type { ICompetitionFormat, MatchData } from './format.interface.js'

/**
 * Single-elimination knockout bracket generator.
 * Entries are seeded into positions so high seeds are separated.
 * Byes are allocated to top seeds when the entry count is not a power of 2.
 * Future rounds are created as placeholder matches (TBD entries).
 */
export class KnockoutFormat implements ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    if (entries.length < 2) return []

    const size = this.nextPowerOfTwo(entries.length)
    const sorted = [...entries].sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999))
    const slots = this.buildSeededSlots(sorted, size)

    const matches: MatchData[] = []
    let matchCounter = 1

    // Round 1 — actual entries
    for (let i = 0; i < size / 2; i++) {
      const home = slots[i * 2]
      const away = slots[i * 2 + 1]
      const isBye = !home || !away
      matches.push({
        round: 1,
        matchNumber: matchCounter++,
        homeEntryId: home ?? null,
        awayEntryId: away ?? null,
        status: isBye ? 'BYE' : 'SCHEDULED',
      })
    }

    // Future rounds — placeholder matches
    let roundMatches = size / 4
    let round = 2
    while (roundMatches >= 1) {
      for (let i = 0; i < roundMatches; i++) {
        matches.push({
          round,
          matchNumber: matchCounter++,
          homeEntryId: null,
          awayEntryId: null,
          status: 'SCHEDULED',
        })
      }
      roundMatches = roundMatches / 2
      round++
    }

    return matches
  }

  private nextPowerOfTwo(n: number): number {
    let p = 1
    while (p < n) p *= 2
    return p
  }

  /**
   * Assigns entries to bracket slots using standard seeding:
   * seed 1 top-left, seed 2 bottom-right, seeds 3&4 in opposite halves, etc.
   */
  private buildSeededSlots(
    sorted: { id: string }[],
    size: number,
  ): (string | null)[] {
    const slots: (string | null)[] = new Array(size * 2).fill(null)
    const positions = this.seededPositions(size)
    sorted.forEach((e, i) => {
      if (positions[i] !== undefined) slots[positions[i]] = e.id
    })
    return slots
  }

  private seededPositions(size: number): number[] {
    if (size === 1) return [0]
    if (size === 2) return [0, 1]
    const half = size / 2
    const top = this.seededPositions(half)
    const bottom = this.seededPositions(half).map(p => p + half)
    // Interleave: seed 1 top, seed 2 bottom, then alternate
    const result: number[] = []
    for (let i = 0; i < top.length; i++) {
      result.push(top[i]!, bottom[i]!)
    }
    return result
  }
}
