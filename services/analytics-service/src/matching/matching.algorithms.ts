// Pure player matching functions

export interface PlayerProfile {
  personId: string
  displayName: string
  eloRating: number | null
  recentBookingCount: number  // last 60 days
}

export interface MatchCandidate {
  personId: string
  displayName: string
  eloRating: number | null
  eloGap: number | null        // absolute difference from seeker, null if no ELO
  recentBookingCount: number
  matchScore: number           // 0–100 (higher = better match)
}

export const ELO_WINDOW = 200  // max ELO gap for a considered match

export function rankCandidates(
  seeker: PlayerProfile,
  candidates: PlayerProfile[],
): MatchCandidate[] {
  const results: MatchCandidate[] = []

  for (const c of candidates) {
    if (c.personId === seeker.personId) continue

    let matchScore = 0
    let eloGap: number | null = null

    if (seeker.eloRating !== null && c.eloRating !== null) {
      eloGap = Math.abs(seeker.eloRating - c.eloRating)
      if (eloGap > ELO_WINDOW) continue  // outside window
      // ELO proximity: 0 gap = 60 pts, ELO_WINDOW gap = 0 pts
      matchScore += Math.round(60 * (1 - eloGap / ELO_WINDOW))
    } else {
      // No ELO — include all, flat base score
      matchScore += 30
    }

    // Activity bonus: up to 40 pts for recent booking frequency
    const activityScore = Math.min(40, c.recentBookingCount * 4)
    matchScore += activityScore

    results.push({ ...c, eloGap, matchScore })
  }

  return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 15)
}
