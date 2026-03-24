import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateTeamDto } from './dto/create-team.dto.js'
import type { UpdateTeamDto } from './dto/update-team.dto.js'

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, sport?: string, activeOnly?: boolean) {
    return this.prisma.team.findMany({
      where: {
        tenantId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(sport ? { sport: sport as any } : {}),
      },
      include: { _count: { select: { members: { where: { isActive: true } }, fixtures: true } } },
      orderBy: [{ sport: 'asc' }, { name: 'asc' }],
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.team.findFirst({
      where: { tenantId, id },
      include: {
        _count: { select: { members: { where: { isActive: true } }, fixtures: true } },
      },
    })
  }

  async create(tenantId: string, dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        tenantId,
        name: dto.name,
        sport: (dto.sport as any) ?? 'football',
        season: dto.season ?? null,
        ageGroup: dto.ageGroup ?? null,
        gender: dto.gender ?? null,
        defaultMatchFee: dto.defaultMatchFee ?? null,
        juniorMatchFee: dto.juniorMatchFee ?? null,
        substituteMatchFee: dto.substituteMatchFee ?? null,
        chargeRule: dto.chargeRule ?? 'selected',
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateTeamDto) {
    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.sport !== undefined) data.sport = dto.sport
    if (dto.season !== undefined) data.season = dto.season ?? null
    if (dto.ageGroup !== undefined) data.ageGroup = dto.ageGroup ?? null
    if (dto.gender !== undefined) data.gender = dto.gender ?? null
    if (dto.defaultMatchFee !== undefined) data.defaultMatchFee = dto.defaultMatchFee ?? null
    if (dto.juniorMatchFee !== undefined) data.juniorMatchFee = dto.juniorMatchFee ?? null
    if (dto.substituteMatchFee !== undefined) data.substituteMatchFee = dto.substituteMatchFee ?? null
    if (dto.chargeRule !== undefined) data.chargeRule = dto.chargeRule
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    await this.prisma.team.updateMany({ where: { tenantId, id }, data })
    return this.findById(tenantId, id)
  }
}
