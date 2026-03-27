export interface MatchData {
  round: number
  matchNumber: number
  homeEntryId: string | null
  awayEntryId: string | null
  status: 'SCHEDULED' | 'BYE'
}

export interface ICompetitionFormat {
  generateDraw(entries: { id: string; seed?: number | null }[]): MatchData[]
}
