import { Injectable } from '@nestjs/common'
import { SelectionRepository } from './selection.repository.js'
import { FixturesRepository } from '../fixtures/fixtures.repository.js'
import type { SetSelectionDto } from './dto/set-selection.dto.js'

@Injectable()
export class SelectionService {
  constructor(
    private readonly repo: SelectionRepository,
    private readonly fixturesRepo: FixturesRepository,
  ) {}

  async getForFixture(tenantId: string, teamId: string, fixtureId: string) {
    const selections = await this.repo.getForFixture(fixtureId)
    return {
      data: selections,
      summary: {
        starters: selections.filter((s) => s.role === 'starter').length,
        substitutes: selections.filter((s) => s.role === 'substitute').length,
        reserves: selections.filter((s) => s.role === 'reserve').length,
        isPublished: selections.some((s) => s.publishedAt !== null),
      },
    }
  }

  async setSelection(tenantId: string, teamId: string, fixtureId: string, dto: SetSelectionDto) {
    const selections = await this.repo.setSelection(fixtureId, dto.players, dto.publish ?? false)
    // Recalculate fixture lifecycle after selection change
    await this.fixturesRepo.recalculateStatus(tenantId, teamId, fixtureId)
    return { data: selections }
  }

  async publish(tenantId: string, teamId: string, fixtureId: string) {
    const selections = await this.repo.publish(fixtureId)
    await this.fixturesRepo.recalculateStatus(tenantId, teamId, fixtureId)
    return { data: selections }
  }
}
