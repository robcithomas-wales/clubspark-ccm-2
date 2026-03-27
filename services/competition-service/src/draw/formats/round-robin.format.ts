import type { ICompetitionFormat, MatchData } from './format.interface.js'

/**
 * Pure round-robin: identical to league but without home/away semantics.
 * Every entry plays every other entry once.
 */
export class RoundRobinFormat implements ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[] {
    if (entries.length < 2) return []
    const matches: MatchData[] = []
    let matchCounter = 1
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        matches.push({
          round: 1,
          matchNumber: matchCounter++,
          homeEntryId: entries[i]?.id ?? null,
          awayEntryId: entries[j]?.id ?? null,
          status: 'SCHEDULED',
        })
      }
    }
    return matches
  }
}
