import { Injectable, NotFoundException } from '@nestjs/common'
import { MatchingRepository } from './matching.repository.js'
import { rankCandidates } from './matching.algorithms.js'

@Injectable()
export class MatchingService {
  constructor(private readonly repo: MatchingRepository) {}

  async findMatches(
    tenantId: string,
    personId: string,
    sport: string,
  ) {
    const [seeker, allPlayers] = await Promise.all([
      this.repo.getPersonProfile(tenantId, personId, sport),
      this.repo.getPlayerProfiles(tenantId, sport),
    ])

    if (!seeker) throw new NotFoundException('Person not found')

    const candidates = rankCandidates(seeker, allPlayers)

    return {
      seeker: {
        personId: seeker.personId,
        displayName: seeker.displayName,
        eloRating: seeker.eloRating,
        sport,
      },
      matches: candidates,
      total: candidates.length,
      hasElo: seeker.eloRating !== null,
    }
  }
}
