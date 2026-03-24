import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { FixturesRepository } from './fixtures.repository.js'
import type { CreateFixtureDto } from './dto/create-fixture.dto.js'
import type { UpdateFixtureDto } from './dto/update-fixture.dto.js'

@Injectable()
export class FixturesService {
  constructor(private readonly repo: FixturesRepository) {}

  async list(tenantId: string, teamId: string, status?: string, upcoming?: boolean) {
    const fixtures = await this.repo.list(tenantId, teamId, status, upcoming)
    return { data: fixtures, pagination: { total: fixtures.length } }
  }

  async findById(tenantId: string, teamId: string, id: string) {
    const fixture = await this.repo.findById(tenantId, teamId, id)
    if (!fixture) throw new NotFoundException('Fixture not found')
    return { data: fixture }
  }

  async create(tenantId: string, teamId: string, dto: CreateFixtureDto) {
    const fixture = await this.repo.create(tenantId, teamId, dto)
    return { data: fixture }
  }

  async update(tenantId: string, teamId: string, id: string, dto: UpdateFixtureDto) {
    const existing = await this.repo.findById(tenantId, teamId, id)
    if (!existing) throw new NotFoundException('Fixture not found')

    if (dto.status === 'cancelled' && existing.chargeRuns.length > 0) {
      const hasActivePay = existing.chargeRuns.some(
        (cr) => cr.status !== 'cancelled'
      )
      if (hasActivePay) {
        throw new BadRequestException('Cannot cancel a fixture with active charge runs')
      }
    }

    const fixture = await this.repo.update(tenantId, teamId, id, dto)
    return { data: fixture }
  }

  async cancel(tenantId: string, teamId: string, id: string) {
    return this.update(tenantId, teamId, id, { status: 'cancelled' })
  }
}
