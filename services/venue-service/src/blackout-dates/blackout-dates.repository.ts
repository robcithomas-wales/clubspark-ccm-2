import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateBlackoutDateDto } from './dto/create-blackout-date.dto.js'
import type { UpdateBlackoutDateDto } from './dto/update-blackout-date.dto.js'

@Injectable()
export class BlackoutDatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, venueId?: string, resourceId?: string) {
    return this.prisma.read.blackoutDate.findMany({
      where: {
        tenantId,
        ...(venueId ? { venueId } : {}),
        ...(resourceId ? { resourceId } : {}),
      },
      orderBy: [{ startDate: 'asc' }],
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.blackoutDate.findFirst({ where: { id, tenantId } })
  }

  create(tenantId: string, dto: CreateBlackoutDateDto) {
    return this.prisma.write.blackoutDate.create({
      data: {
        tenantId,
        venueId: dto.venueId,
        resourceId: dto.resourceId ?? null,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        recurrenceRule: dto.recurrenceRule ?? null,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateBlackoutDateDto) {
    const existing = await this.prisma.read.blackoutDate.findFirst({ where: { id, tenantId } })
    if (!existing) return null

    return this.prisma.write.blackoutDate.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        recurrenceRule: dto.recurrenceRule !== undefined ? (dto.recurrenceRule || null) : existing.recurrenceRule,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.read.blackoutDate.findFirst({ where: { id, tenantId } })
    if (!existing) return null
    return this.prisma.write.blackoutDate.delete({ where: { id } })
  }
}
