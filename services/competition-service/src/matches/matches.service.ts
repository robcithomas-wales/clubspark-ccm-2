import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { MatchesRepository } from './matches.repository.js'
import { StandingsService } from '../standings/standings.service.js'
import { RankingsService } from '../rankings/rankings.service.js'
import type { SubmitResultDto } from './dto/submit-result.dto.js'
import type { UpdateMatchDto } from './dto/update-match.dto.js'

@Injectable()
export class MatchesService {
  constructor(
    private readonly repo: MatchesRepository,
    private readonly standingsService: StandingsService,
    private readonly rankingsService: RankingsService,
  ) {}

  async list(competitionId: string, divisionId?: string, round?: number) {
    return { data: await this.repo.list(competitionId, divisionId, round) }
  }

  async findById(competitionId: string, id: string) {
    const m = await this.repo.findById(id, competitionId)
    if (!m) throw new NotFoundException('Match not found')
    return { data: m }
  }

  async update(competitionId: string, id: string, dto: UpdateMatchDto) {
    const existing = await this.repo.findById(id, competitionId)
    if (!existing) throw new NotFoundException('Match not found')
    const data: any = {}
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt)
    if (dto.venueId !== undefined) data.venueId = dto.venueId
    if (dto.resourceId !== undefined) data.resourceId = dto.resourceId
    if (dto.bookableUnitId !== undefined) data.bookableUnitId = dto.bookableUnitId
    if (dto.bookingId !== undefined) data.bookingId = dto.bookingId
    if (dto.status !== undefined) data.status = dto.status
    if (dto.notes !== undefined) data.notes = dto.notes
    const m = await this.repo.update(id, data)
    return { data: m }
  }

  /**
   * Submit a result.
   * - Players submit: sets resultStatus=SUBMITTED, awaits admin verification.
   * - Admins submit with adminVerify=true: sets resultStatus=VERIFIED immediately and recalculates standings.
   */
  async submitResult(competitionId: string, id: string, dto: SubmitResultDto, isAdmin: boolean) {
    const match = await this.repo.findById(id, competitionId)
    if (!match) throw new NotFoundException('Match not found')
    if (match.status === 'COMPLETED' && match.resultStatus === 'VERIFIED') {
      if (!isAdmin) throw new ForbiddenException('Result already verified — contact admin to change')
    }

    const verified = isAdmin && (dto.adminVerify !== false)
    const now = new Date()

    const data: any = {
      winnerId: dto.winnerId ?? null,
      score: dto.score,
      homePoints: dto.homePoints ?? null,
      awayPoints: dto.awayPoints ?? null,
      notes: dto.notes ?? null,
      submittedBy: dto.submittedBy ?? null,
      submittedAt: now,
      status: verified ? 'COMPLETED' : 'IN_PROGRESS',
      resultStatus: verified ? 'VERIFIED' : 'SUBMITTED',
      ...(verified ? { verifiedBy: dto.submittedBy ?? null, verifiedAt: now } : {}),
    }

    const updated = await this.repo.update(id, data)

    // Trigger standing + ranking recalculation when verified
    if (verified && match.divisionId) {
      await this.standingsService.recalculate(competitionId, match.divisionId)
    }
    if (verified) {
      await this.rankingsService.processMatchResult({ ...match, ...updated }).catch(() => {})
    }

    return { data: updated }
  }

  /**
   * Admin verifies a player-submitted result.
   */
  async verifyResult(competitionId: string, id: string, adminId?: string | null) {
    const match = await this.repo.findById(id, competitionId)
    if (!match) throw new NotFoundException('Match not found')
    if (match.resultStatus !== 'SUBMITTED') {
      throw new BadRequestException('Match result is not in SUBMITTED state')
    }

    const updated = await this.repo.update(id, {
      resultStatus: 'VERIFIED',
      status: 'COMPLETED',
      verifiedBy: adminId ?? null,
      verifiedAt: new Date(),
    })

    if (match.divisionId) {
      await this.standingsService.recalculate(competitionId, match.divisionId)
    }
    await this.rankingsService.processMatchResult({ ...match, ...updated }).catch(() => {})

    return { data: updated }
  }

  /**
   * Admin disputes a result (sends back for correction).
   */
  async disputeResult(competitionId: string, id: string, adminId: string) {
    const match = await this.repo.findById(id, competitionId)
    if (!match) throw new NotFoundException('Match not found')
    const updated = await this.repo.update(id, {
      resultStatus: 'DISPUTED',
      status: 'SCHEDULED',
      verifiedBy: null,
      verifiedAt: null,
    })
    return { data: updated }
  }
}
