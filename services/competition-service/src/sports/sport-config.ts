export interface SportConfig {
  sport: string
  label: string
  /** How scores are described: goals (football), sets (tennis), games (squash/badminton) */
  scoreType: 'goals' | 'sets' | 'games' | 'points'
  /** Max number of sets/games (nil for single-score sports) */
  setCount?: number
  /** What determines the winner */
  winCondition: 'sets_won' | 'goals' | 'games_won' | 'points'
  /** League points allocated per result */
  matchPoints: { win: number; draw: number; loss: number }
  /** Default tiebreak order when points are equal */
  defaultTiebreaks: Array<'head_to_head' | 'goal_difference' | 'goals_for' | 'sets_won' | 'games_won' | 'points_difference' | 'points_for' | 'net_run_rate'>
  /** How to display the score in the UI */
  displayTemplate: 'score' | 'sets' | 'games'
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  tennis: {
    sport: 'tennis', label: 'Tennis', scoreType: 'sets', setCount: 3,
    winCondition: 'sets_won', matchPoints: { win: 1, draw: 0, loss: 0 },
    defaultTiebreaks: ['sets_won', 'games_won', 'head_to_head'], displayTemplate: 'sets',
  },
  padel: {
    sport: 'padel', label: 'Padel', scoreType: 'sets', setCount: 3,
    winCondition: 'sets_won', matchPoints: { win: 1, draw: 0, loss: 0 },
    defaultTiebreaks: ['sets_won', 'games_won', 'head_to_head'], displayTemplate: 'sets',
  },
  squash: {
    sport: 'squash', label: 'Squash', scoreType: 'games', setCount: 5,
    winCondition: 'games_won', matchPoints: { win: 1, draw: 0, loss: 0 },
    defaultTiebreaks: ['games_won', 'points_difference', 'head_to_head'], displayTemplate: 'games',
  },
  badminton: {
    sport: 'badminton', label: 'Badminton', scoreType: 'games', setCount: 3,
    winCondition: 'games_won', matchPoints: { win: 1, draw: 0, loss: 0 },
    defaultTiebreaks: ['games_won', 'points_difference', 'head_to_head'], displayTemplate: 'games',
  },
  football: {
    sport: 'football', label: 'Football', scoreType: 'goals',
    winCondition: 'goals', matchPoints: { win: 3, draw: 1, loss: 0 },
    defaultTiebreaks: ['goal_difference', 'goals_for', 'head_to_head'], displayTemplate: 'score',
  },
  hockey: {
    sport: 'hockey', label: 'Hockey', scoreType: 'goals',
    winCondition: 'goals', matchPoints: { win: 3, draw: 1, loss: 0 },
    defaultTiebreaks: ['goal_difference', 'goals_for', 'head_to_head'], displayTemplate: 'score',
  },
  netball: {
    sport: 'netball', label: 'Netball', scoreType: 'goals',
    winCondition: 'goals', matchPoints: { win: 3, draw: 1, loss: 0 },
    defaultTiebreaks: ['goal_difference', 'goals_for', 'head_to_head'], displayTemplate: 'score',
  },
  basketball: {
    sport: 'basketball', label: 'Basketball', scoreType: 'points',
    winCondition: 'points', matchPoints: { win: 2, draw: 0, loss: 1 },
    defaultTiebreaks: ['head_to_head', 'points_difference', 'points_for'], displayTemplate: 'score',
  },
  cricket: {
    sport: 'cricket', label: 'Cricket', scoreType: 'points',
    winCondition: 'points', matchPoints: { win: 12, draw: 4, loss: 0 },
    defaultTiebreaks: ['net_run_rate', 'head_to_head'], displayTemplate: 'score',
  },
  rugby_union: {
    sport: 'rugby_union', label: 'Rugby Union', scoreType: 'points',
    winCondition: 'points', matchPoints: { win: 4, draw: 2, loss: 0 },
    defaultTiebreaks: ['points_difference', 'points_for', 'head_to_head'], displayTemplate: 'score',
  },
}

export function getSportConfig(sport: string): SportConfig {
  return SPORT_CONFIGS[sport] ?? {
    sport, label: sport, scoreType: 'goals', winCondition: 'goals',
    matchPoints: { win: 3, draw: 1, loss: 0 },
    defaultTiebreaks: ['goal_difference', 'goals_for', 'head_to_head'],
    displayTemplate: 'score',
  }
}
