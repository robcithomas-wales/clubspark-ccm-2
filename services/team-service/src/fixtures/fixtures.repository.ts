import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateFixtureDto } from './dto/create-fixture.dto.js'
import type { UpdateFixtureDto } from './dto/update-fixture.dto.js'

@Injectable()
export class FixturesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, teamId: string, status?: string, upcoming?: boolean) {
    const now = new Date()
    return this.prisma.fixture.findMany({
      where: {
        tenantId,
        teamId,
        ...(status ? { status: status as any } : {}),
        ...(upcoming ? { kickoffAt: { gte: now } } : {}),
      },
      include: {
        _count: {
          select: {
            availability: true,
            selections: true,
            chargeRuns: true,
          },
        },
      },
      orderBy: { kickoffAt: 'asc' },
    })
  }

  async findById(tenantId: string, teamId: string, id: string) {
    return this.prisma.fixture.findFirst({
      where: { tenantId, teamId, id },
      include: {
        availability: { include: { teamMember: true } },
        selections: { include: { teamMember: true }, orderBy: [{ role: 'asc' }, { shirtNumber: 'asc' }] },
        chargeRuns: { include: { charges: true } },
      },
    })
  }

  async create(tenantId: string, teamId: string, dto: CreateFixtureDto) {
    return this.prisma.fixture.create({
      data: {
        tenantId,
        teamId,
        opponent: dto.opponent,
        kickoffAt: new Date(dto.kickoffAt),
        homeAway: (dto.homeAway as any) ?? 'home',
        venue: dto.venue ?? null,
        meetTime: dto.meetTime ? new Date(dto.meetTime) : null,
        durationMinutes: dto.durationMinutes ?? null,
        matchType: dto.matchType ?? null,
        notes: dto.notes ?? null,
        externalRef: dto.externalRef ?? null,
        status: 'scheduled',
      },
    })
  }

  async update(tenantId: string, teamId: string, id: string, dto: UpdateFixtureDto) {
    const data: Record<string, unknown> = {}
    if (dto.opponent !== undefined) data.opponent = dto.opponent
    if (dto.kickoffAt !== undefined) data.kickoffAt = new Date(dto.kickoffAt)
    if (dto.homeAway !== undefined) data.homeAway = dto.homeAway
    if (dto.venue !== undefined) data.venue = dto.venue ?? null
    if (dto.meetTime !== undefined) data.meetTime = dto.meetTime ? new Date(dto.meetTime) : null
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes ?? null
    if (dto.matchType !== undefined) data.matchType = dto.matchType ?? null
    if (dto.notes !== undefined) data.notes = dto.notes ?? null
    if (dto.status !== undefined) data.status = dto.status

    await this.prisma.fixture.updateMany({ where: { tenantId, teamId, id }, data })
    return this.findById(tenantId, teamId, id)
  }

  async updateStatus(tenantId: string, teamId: string, id: string, status: string) {
    await this.prisma.fixture.updateMany({ where: { tenantId, teamId, id }, data: { status: status as any } })
    return this.findById(tenantId, teamId, id)
  }

  // Recalculate lifecycle status based on child records
  async recalculateStatus(tenantId: string, teamId: string, id: string) {
    const fixture = await this.findById(tenantId, teamId, id)
    if (!fixture || fixture.status === 'cancelled' || fixture.status === 'completed') return fixture

    let newStatus: string = fixture.status

    const hasSelections = fixture.selections.length > 0
    const hasPublishedSelection = fixture.selections.some((s) => s.publishedAt !== null)
    const hasChargeRun = fixture.chargeRuns.length > 0
    const isPast = new Date(fixture.kickoffAt) < new Date()

    if (isPast && hasChargeRun) {
      newStatus = 'fees_requested'
    } else if (hasPublishedSelection) {
      newStatus = 'squad_selected'
    } else if (fixture.status === 'draft') {
      newStatus = 'scheduled'
    }

    if (newStatus !== fixture.status) {
      await this.prisma.fixture.updateMany({
        where: { tenantId, teamId, id },
        data: { status: newStatus as any },
      })
      return this.findById(tenantId, teamId, id)
    }

    return fixture
  }
}
