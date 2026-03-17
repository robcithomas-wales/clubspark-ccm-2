import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateResourceGroupDto } from './dto/create-resource-group.dto'
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto'

@Injectable()
export class ResourceGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, venueId?: string) {
    return this.prisma.read.resourceGroup.findMany({
      where: { tenantId, ...(venueId ? { venueId } : {}) },
      select: {
        id: true,
        tenantId: true,
        venueId: true,
        name: true,
        sport: true,
        description: true,
        colour: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { resources: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.read.resourceGroup.findFirst({
      where: { id, tenantId },
      include: {
        resources: {
          select: { id: true, name: true, resourceType: true, sport: true, isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    })
  }

  async create(tenantId: string, dto: CreateResourceGroupDto) {
    return this.prisma.write.resourceGroup.create({
      data: {
        tenantId,
        venueId: dto.venueId,
        name: dto.name,
        sport: dto.sport ?? null,
        description: dto.description ?? null,
        colour: dto.colour ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateResourceGroupDto) {
    const existing = await this.prisma.read.resourceGroup.findFirst({
      where: { id, tenantId },
    })
    if (!existing) return null

    return this.prisma.write.resourceGroup.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        sport: dto.sport !== undefined ? dto.sport : existing.sport,
        description: dto.description !== undefined ? dto.description : existing.description,
        colour: dto.colour !== undefined ? dto.colour : existing.colour,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.read.resourceGroup.findFirst({
      where: { id, tenantId },
    })
    if (!existing) return null
    return this.prisma.write.resourceGroup.delete({ where: { id } })
  }
}
