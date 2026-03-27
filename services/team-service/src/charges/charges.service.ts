import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ChargesRepository } from './charges.repository.js'
import { FixturesRepository } from '../fixtures/fixtures.repository.js'
import { SelectionRepository } from '../selection/selection.repository.js'
import { TeamsRepository } from '../teams/teams.repository.js'
import type { CreateChargeRunDto } from './dto/create-charge-run.dto.js'

@Injectable()
export class ChargesService {
  constructor(
    private readonly repo: ChargesRepository,
    private readonly fixturesRepo: FixturesRepository,
    private readonly selectionRepo: SelectionRepository,
    private readonly teamsRepo: TeamsRepository,
  ) {}

  async getRunsForFixture(tenantId: string, teamId: string, fixtureId: string) {
    const fixture = await this.fixturesRepo.findById(tenantId, teamId, fixtureId)
    if (!fixture) {
      throw new NotFoundException('Fixture not found')
    }
    const runs = await this.repo.getRunsForFixture(fixtureId)
    return { data: runs }
  }

  async createRun(
    tenantId: string,
    teamId: string,
    fixtureId: string,
    dto: CreateChargeRunDto,
    initiatedBy: string | null,
  ) {
    const fixture = await this.fixturesRepo.findById(tenantId, teamId, fixtureId)
    if (!fixture) {
      throw new NotFoundException('Fixture not found')
    }
    if (fixture.status === 'cancelled') {
      throw new BadRequestException('Cannot charge a cancelled fixture')
    }

    const team = await this.teamsRepo.findById(tenantId, teamId)
    if (!team) throw new NotFoundException('Team not found')

    // Get the current selection to determine who to charge
    const selections = await this.selectionRepo.getForFixture(fixtureId)
    if (selections.length === 0) {
      throw new BadRequestException('No selection exists for this fixture — set a squad first')
    }

    // Determine which selections to charge
    let targets = selections.filter((s) => s.role === 'starter' || s.role === 'substitute')
    if (dto.teamMemberIds && dto.teamMemberIds.length > 0) {
      const allowedIds = new Set(dto.teamMemberIds)
      targets = targets.filter((s) => allowedIds.has(s.teamMemberId))
    }

    if (targets.length === 0) {
      throw new BadRequestException('No eligible players to charge')
    }

    // Determine amount per player using team fee rules
    const charges = targets.map((s) => {
      const member = s.teamMember as { isJunior: boolean }
      let amount = Number(team.defaultMatchFee ?? 0)
      if (member.isJunior && team.juniorMatchFee !== null) {
        amount = Number(team.juniorMatchFee)
      }
      if (s.role === 'substitute' && team.substituteMatchFee !== null) {
        amount = Number(team.substituteMatchFee)
      }
      return { teamMemberId: s.teamMemberId, amount }
    })

    const run = await this.repo.createRun(tenantId, fixtureId, initiatedBy, dto.notes, charges)

    // Recalculate fixture status (now has an active charge run)
    await this.fixturesRepo.recalculateStatus(tenantId, teamId, fixtureId)

    return { data: run }
  }

  async waiveCharge(tenantId: string, chargeId: string, notes?: string) {
    const updated = await this.repo.markChargeWaived(chargeId, notes)
    return { data: updated }
  }

  async markChargePaid(chargeId: string, paymentId?: string) {
    const updated = await this.repo.markChargePaid(chargeId, paymentId)
    return { data: updated }
  }
}
