import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AvailabilityWindowDto } from './dto/set-availability.dto.js'
import type { CreateBlockDto } from './dto/create-block.dto.js'

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWindows(tenantId: string, coachId: string) {
    return this.prisma.coachAvailability.findMany({
      where: { tenantId, coachId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
  }

  async setWindows(tenantId: string, coachId: string, windows: AvailabilityWindowDto[]) {
    await this.prisma.$transaction([
      this.prisma.coachAvailability.deleteMany({ where: { tenantId, coachId } }),
      this.prisma.coachAvailability.createMany({
        data: windows.map((w) => ({
          tenantId,
          coachId,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
          lessonTypeId: w.lessonTypeId ?? null,
        })),
      }),
    ])
    return this.getWindows(tenantId, coachId)
  }

  async getBlocks(tenantId: string, coachId: string, from: Date, to: Date) {
    return this.prisma.coachBlock.findMany({
      where: {
        tenantId,
        coachId,
        // Block overlaps the query window
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      orderBy: { startsAt: 'asc' },
    })
  }

  async createBlock(tenantId: string, coachId: string, dto: CreateBlockDto) {
    return this.prisma.coachBlock.create({
      data: {
        tenantId,
        coachId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason ?? null,
      },
    })
  }

  async deleteBlock(tenantId: string, coachId: string, blockId: string) {
    return this.prisma.coachBlock.deleteMany({
      where: { tenantId, coachId, id: blockId },
    })
  }
}
