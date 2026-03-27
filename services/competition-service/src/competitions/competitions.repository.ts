import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateCompetitionDto } from './dto/create-competition.dto.js'
import type { UpdateCompetitionDto } from './dto/update-competition.dto.js'

@Injectable()
export class CompetitionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number, filters: { status?: string; sport?: string }) {
    const where: any = { tenantId, ...(filters.status ? { status: filters.status } : {}), ...(filters.sport ? { sport: filters.sport } : {}) }
    const offset = (page - 1) * limit
    const [competitions, total] = await Promise.all([
      this.prisma.competition.findMany({
        where, skip: offset, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { divisions: { orderBy: { sortOrder: 'asc' } }, _count: { select: { entries: true, matches: true } } },
      }),
      this.prisma.competition.count({ where }),
    ])
    return { competitions, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.competition.findFirst({
      where: { tenantId, id },
      include: {
        divisions: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { entries: true, matches: true } } } },
        _count: { select: { entries: true, matches: true } },
      },
    })
  }

  async create(tenantId: string, organisationId: string | undefined, dto: CreateCompetitionDto) {
    return this.prisma.competition.create({
      data: {
        tenantId,
        ...(organisationId ? { organisationId } : {}),
        name: dto.name,
        description: dto.description ?? null,
        sport: dto.sport,
        season: dto.season ?? null,
        format: dto.format as any,
        entryType: (dto.entryType ?? 'INDIVIDUAL') as any,
        registrationOpensAt: dto.registrationOpensAt ? new Date(dto.registrationOpensAt) : null,
        registrationClosesAt: dto.registrationClosesAt ? new Date(dto.registrationClosesAt) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        maxEntries: dto.maxEntries ?? null,
        entryFee: dto.entryFee ?? null,
        isPublic: dto.isPublic ?? true,
        eligibilityRules: dto.eligibilityRules as any ?? undefined,
        tiebreakRules: dto.tiebreakRules as any ?? undefined,
        // Auto-create a Main division
        divisions: {
          create: [{ name: 'Main', sortOrder: 0 }],
        },
      },
      include: { divisions: true },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateCompetitionDto) {
    const data: any = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description
    if (dto.season !== undefined) data.season = dto.season
    if (dto.status !== undefined) data.status = dto.status
    if (dto.registrationOpensAt !== undefined) data.registrationOpensAt = new Date(dto.registrationOpensAt)
    if (dto.registrationClosesAt !== undefined) data.registrationClosesAt = new Date(dto.registrationClosesAt)
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate)
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate)
    if (dto.maxEntries !== undefined) data.maxEntries = dto.maxEntries
    if (dto.entryFee !== undefined) data.entryFee = dto.entryFee
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic
    if (dto.tiebreakRules !== undefined) data.tiebreakRules = dto.tiebreakRules

    await this.prisma.competition.updateMany({ where: { tenantId, id }, data })
    return this.findById(tenantId, id)
  }

  async delete(tenantId: string, id: string) {
    await this.prisma.competition.deleteMany({ where: { tenantId, id } })
  }
}
