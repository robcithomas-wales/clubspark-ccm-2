import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateLessonTypeDto } from './dto/create-lesson-type.dto.js'
import type { UpdateLessonTypeDto } from './dto/update-lesson-type.dto.js'

@Injectable()
export class LessonTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number, sport?: string, activeOnly?: boolean) {
    const offset = (page - 1) * limit
    const where = {
      tenantId,
      ...(activeOnly ? { isActive: true } : {}),
      ...(sport ? { sport } : {}),
    }

    const [lessonTypes, total] = await Promise.all([
      this.prisma.lessonType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.lessonType.count({ where }),
    ])

    return { lessonTypes, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.lessonType.findFirst({ where: { tenantId, id } })
  }

  async create(tenantId: string, dto: CreateLessonTypeDto) {
    return this.prisma.lessonType.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        sport: dto.sport ?? null,
        durationMinutes: dto.durationMinutes,
        maxParticipants: dto.maxParticipants ?? 1,
        pricePerSession: dto.pricePerSession ?? 0,
        currency: dto.currency ?? 'GBP',
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateLessonTypeDto) {
    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.description !== undefined) data.description = dto.description ?? null
    if (dto.sport !== undefined) data.sport = dto.sport ?? null
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes
    if (dto.maxParticipants !== undefined) data.maxParticipants = dto.maxParticipants
    if (dto.pricePerSession !== undefined) data.pricePerSession = dto.pricePerSession
    if (dto.currency !== undefined) data.currency = dto.currency
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    return this.prisma.lessonType.updateMany({ where: { tenantId, id }, data })
  }
}
