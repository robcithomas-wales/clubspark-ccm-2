import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateCoachDto } from './dto/create-coach.dto.js'
import type { UpdateCoachDto } from './dto/update-coach.dto.js'

@Injectable()
export class CoachesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number, activeOnly: boolean) {
    const offset = (page - 1) * limit
    const where = {
      tenantId,
      ...(activeOnly ? { isActive: true } : {}),
    }

    const [coaches, total] = await Promise.all([
      this.prisma.coach.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip: offset,
        take: limit,
        include: {
          lessonTypes: { include: { lessonType: true } },
        },
      }),
      this.prisma.coach.count({ where }),
    ])

    return { coaches, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.coach.findFirst({
      where: { tenantId, id },
      include: {
        lessonTypes: { include: { lessonType: true } },
        availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        blocks: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } },
      },
    })
  }

  async create(tenantId: string, dto: CreateCoachDto) {
    return this.prisma.coach.create({
      data: {
        tenantId,
        ...(dto.customerId ? { customerId: dto.customerId } : {}),
        displayName: dto.displayName,
        bio: dto.bio ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        specialties: dto.specialties ?? [],
        isActive: dto.isActive ?? true,
        ...(dto.lessonTypeIds?.length
          ? {
              lessonTypes: {
                create: dto.lessonTypeIds.map((id) => ({ lessonTypeId: id })),
              },
            }
          : {}),
      },
      include: { lessonTypes: { include: { lessonType: true } } },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateCoachDto) {
    const data: Record<string, unknown> = {}
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.bio !== undefined) data.bio = dto.bio ?? null
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl ?? null
    if (dto.specialties !== undefined) data.specialties = dto.specialties
    if (dto.isActive !== undefined) data.isActive = dto.isActive

    await this.prisma.$transaction(async (tx) => {
      await tx.coach.updateMany({ where: { tenantId, id }, data })

      if (dto.lessonTypeIds !== undefined) {
        await tx.coachLessonType.deleteMany({ where: { coachId: id } })
        if (dto.lessonTypeIds.length > 0) {
          await tx.coachLessonType.createMany({
            data: dto.lessonTypeIds.map((ltId) => ({ coachId: id, lessonTypeId: ltId })),
          })
        }
      }
    })

    return this.findById(tenantId, id)
  }
}
