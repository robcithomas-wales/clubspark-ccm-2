import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateSponsorDto } from './dto/create-sponsor.dto.js'
import type { UpdateSponsorDto } from './dto/update-sponsor.dto.js'

@Injectable()
export class SponsorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, activeOnly = true) {
    return this.prisma.read.sponsor.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.read.sponsor.findFirst({ where: { tenantId, id } })
  }

  async findOrgId(tenantId: string): Promise<string | null> {
    const org = await this.prisma.read.organisation.findUnique({
      where: { tenantId },
      select: { id: true },
    })
    return org?.id ?? null
  }

  async create(tenantId: string, organisationId: string, dto: CreateSponsorDto) {
    return this.prisma.write.sponsor.create({
      data: {
        tenantId,
        organisationId,
        name: dto.name,
        logoUrl: dto.logoUrl,
        websiteUrl: dto.websiteUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateSponsorDto) {
    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl ?? null
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    await this.prisma.write.sponsor.updateMany({ where: { tenantId, id }, data })
    return this.findById(tenantId, id)
  }

  async remove(tenantId: string, id: string) {
    await this.prisma.write.sponsor.updateMany({ where: { tenantId, id }, data: { isActive: false } })
  }
}
