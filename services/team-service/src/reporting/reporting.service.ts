import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Cross-team overview ─────────────────────────────────────────────────────
  async getOverview(tenantId: string) {
    const teams = await this.prisma.team.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { members: true, fixtures: true } },
      },
    })

    const now = new Date()

    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const [upcomingCount, outstandingAgg] = await Promise.all([
          this.prisma.fixture.count({
            where: { tenantId, teamId: team.id, kickoffAt: { gte: now }, status: { notIn: ['cancelled'] } },
          }),
          this.prisma.charge.aggregate({
            where: {
              status: 'pending',
              chargeRun: { tenantId },
              teamMember: { teamId: team.id },
            },
            _sum: { amount: true },
          }),
        ])

        return {
          id: team.id,
          name: team.name,
          sport: team.sport,
          season: team.season,
          ageGroup: team.ageGroup,
          activePlayers: team._count.members,
          totalFixtures: team._count.fixtures,
          upcomingFixtures: upcomingCount,
          outstandingFees: Number(outstandingAgg._sum.amount ?? 0),
        }
      }),
    )

    return { data: teamsWithStats }
  }

  // ── All fixtures across all teams ──────────────────────────────────────────
  async getFixtures(tenantId: string, season?: string) {
    const teams = await this.prisma.team.findMany({
      where: { tenantId, isActive: true, ...(season ? { season } : {}) },
      select: { id: true, name: true, sport: true, season: true, ageGroup: true },
    })

    const teamIds = teams.map((t) => t.id)
    if (teamIds.length === 0) return { data: [] }

    const teamMap = new Map(teams.map((t) => [t.id, t]))

    const fixtures = await this.prisma.fixture.findMany({
      where: { tenantId, teamId: { in: teamIds } },
      include: {
        _count: { select: { availability: true, selections: true } },
      },
      orderBy: { kickoffAt: 'asc' },
    })

    const result = fixtures.map((f) => {
      const team = teamMap.get(f.teamId)!
      const result = computeResult(f.homeAway as string, f.homeScore, f.awayScore)
      return {
        id: f.id,
        teamId: f.teamId,
        teamName: team.name,
        sport: team.sport,
        season: team.season,
        ageGroup: team.ageGroup,
        opponent: f.opponent,
        homeAway: f.homeAway,
        venue: f.venue,
        kickoffAt: f.kickoffAt,
        matchType: f.matchType,
        status: f.status,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        result,
        availabilityResponses: f._count.availability,
        selectionCount: f._count.selections,
      }
    })

    return { data: result }
  }

  // ── All charges across all teams ───────────────────────────────────────────
  async getCharges(tenantId: string, season?: string) {
    const teams = await this.prisma.team.findMany({
      where: { tenantId, isActive: true, ...(season ? { season } : {}) },
      select: { id: true, name: true, sport: true, season: true },
    })

    const teamIds = teams.map((t) => t.id)
    if (teamIds.length === 0) return { data: [] }

    const teamMap = new Map(teams.map((t) => [t.id, t]))

    const charges = await this.prisma.charge.findMany({
      where: {
        chargeRun: { tenantId },
        teamMember: { teamId: { in: teamIds } },
      },
      include: {
        teamMember: { select: { id: true, displayName: true, isJunior: true, teamId: true } },
        chargeRun: {
          select: {
            id: true,
            createdAt: true,
            notes: true,
            fixture: {
              select: { id: true, opponent: true, kickoffAt: true, matchType: true, homeAway: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = charges.map((c) => {
      const team = teamMap.get(c.teamMember.teamId)
      return {
        id: c.id,
        teamId: c.teamMember.teamId,
        teamName: team?.name ?? 'Unknown',
        season: team?.season,
        playerId: c.teamMember.id,
        playerName: c.teamMember.displayName,
        isJunior: c.teamMember.isJunior,
        fixtureId: c.chargeRun.fixture.id,
        opponent: c.chargeRun.fixture.opponent,
        kickoffAt: c.chargeRun.fixture.kickoffAt,
        matchType: c.chargeRun.fixture.matchType,
        chargeRunId: c.chargeRun.id,
        chargeRunDate: c.chargeRun.createdAt,
        amount: Number(c.amount),
        status: c.status,
        paidAt: c.paidAt,
        notes: c.notes,
      }
    })

    return { data: result }
  }

  // ── Player stats: availability + selection per team ────────────────────────
  async getPlayerStats(tenantId: string, teamId?: string) {
    const teamFilter = teamId
      ? { id: teamId, tenantId }
      : { tenantId, isActive: true }

    const teams = await this.prisma.team.findMany({
      where: teamFilter,
      include: {
        members: {
          where: { isActive: true },
          select: {
            id: true,
            displayName: true,
            position: true,
            shirtNumber: true,
            isJunior: true,
            isGuest: true,
            availability: {
              include: {
                fixture: { select: { id: true, kickoffAt: true, opponent: true, status: true } },
              },
            },
            selections: {
              include: {
                fixture: { select: { id: true, kickoffAt: true, opponent: true, status: true } },
              },
            },
          },
        },
      },
    })

    const result = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      sport: team.sport,
      season: team.season,
      players: team.members.map((m) => {
        const totalFixturesWithAvail = m.availability.length
        const responded = m.availability.filter((a) => a.response !== 'no_response').length
        const available = m.availability.filter((a) => a.response === 'available').length
        const maybe = m.availability.filter((a) => a.response === 'maybe').length
        const unavailable = m.availability.filter((a) => a.response === 'unavailable').length

        const completedFixtures = m.availability.filter(
          (a) => a.fixture.status === 'completed',
        ).length

        const starts = m.selections.filter((s) => s.role === 'starter').length
        const subs = m.selections.filter((s) => s.role === 'substitute').length
        const reserves = m.selections.filter((s) => s.role === 'reserve').length
        const totalSelected = starts + subs

        return {
          id: m.id,
          displayName: m.displayName,
          position: m.position,
          shirtNumber: m.shirtNumber,
          isJunior: m.isJunior,
          isGuest: m.isGuest,
          availability: {
            totalRequested: totalFixturesWithAvail,
            responded,
            available,
            maybe,
            unavailable,
            noResponse: totalFixturesWithAvail - responded,
            responseRate: totalFixturesWithAvail > 0 ? Math.round((responded / totalFixturesWithAvail) * 100) : null,
            availabilityRate: responded > 0 ? Math.round((available / responded) * 100) : null,
          },
          selection: {
            starts,
            subs,
            reserves,
            totalSelected,
            completedFixtures,
            selectionRate: completedFixtures > 0 ? Math.round((totalSelected / completedFixtures) * 100) : null,
          },
        }
      }),
    }))

    return { data: result }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeResult(
  homeAway: string,
  homeScore: number | null,
  awayScore: number | null,
): 'win' | 'draw' | 'loss' | null {
  if (homeScore === null || awayScore === null) return null
  if (homeScore === awayScore) return 'draw'
  if (homeAway === 'home') return homeScore > awayScore ? 'win' : 'loss'
  if (homeAway === 'away') return awayScore > homeScore ? 'win' : 'loss'
  return null // neutral — no win/loss concept
}
