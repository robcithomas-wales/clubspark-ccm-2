import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface AudienceRule {
  field: string    // e.g. membershipStatus, ageMin, ageMax, tag, bookingCountMin
  operator: string // eq | neq | gte | lte | contains
  value: string | number
}

export interface AudienceRulesJson {
  logic: 'and' | 'or'
  rules: AudienceRule[]
}

export interface CreateSavedAudienceDto {
  name: string
  description?: string
  rulesJson: AudienceRulesJson
}

export interface UpdateSavedAudienceDto {
  name?: string
  description?: string
  rulesJson?: AudienceRulesJson
}

@Injectable()
export class AudiencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const audiences = await this.prisma.read.savedAudience.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return { data: audiences }
  }

  async findById(tenantId: string, id: string) {
    const audience = await this.prisma.read.savedAudience.findFirst({
      where: { id, tenantId },
    })
    if (!audience) throw new NotFoundException('Saved audience not found')
    return { data: audience }
  }

  async create(tenantId: string, dto: CreateSavedAudienceDto) {
    const audience = await this.prisma.write.savedAudience.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        rulesJson: JSON.stringify(dto.rulesJson),
      },
    })
    return { data: audience }
  }

  async update(tenantId: string, id: string, dto: UpdateSavedAudienceDto) {
    const existing = await this.prisma.read.savedAudience.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Saved audience not found')

    const updated = await this.prisma.write.savedAudience.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        rulesJson: dto.rulesJson ? JSON.stringify(dto.rulesJson) : existing.rulesJson,
      },
    })
    return { data: updated }
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.read.savedAudience.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException('Saved audience not found')
    await this.prisma.write.savedAudience.delete({ where: { id } })
  }
}
