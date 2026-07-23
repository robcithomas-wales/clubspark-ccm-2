import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface CreateSeasonalScheduleDto {
  venueId: string
  name: string
  startDate: string
  endDate: string
  status?: string
  notes?: string
}

export interface UpdateSeasonalScheduleDto {
  name?: string
  startDate?: string
  endDate?: string
  status?: string
  notes?: string
}

@Injectable()
export class SeasonalSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, venueId?: string, status?: string) {
    return this.prisma.read.seasonalSchedule.findMany({
      where: {
        tenantId,
        ...(venueId ? { venueId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ startDate: 'asc' }],
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.seasonalSchedule.findFirst({ where: { id, tenantId } })
  }

  create(tenantId: string, dto: CreateSeasonalScheduleDto) {
    return this.prisma.write.seasonalSchedule.create({
      data: {
        tenantId,
        venueId: dto.venueId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? 'draft',
        notes: dto.notes ?? null,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateSeasonalScheduleDto) {
    const existing = await this.prisma.read.seasonalSchedule.findFirst({ where: { id, tenantId } })
    if (!existing) return null

    return this.prisma.write.seasonalSchedule.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
        status: dto.status ?? existing.status,
        notes: dto.notes !== undefined ? (dto.notes || null) : existing.notes,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.read.seasonalSchedule.findFirst({ where: { id, tenantId } })
    if (!existing) return null
    return this.prisma.write.seasonalSchedule.delete({ where: { id } })
  }
}
