import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateDivisionDto } from './dto/create-division.dto.js'

@Injectable()
export class DivisionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(competitionId: string) {
    return this.prisma.division.findMany({
      where: { competitionId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { entries: true, matches: true } } },
    })
  }

  async findById(id: string, competitionId: string) {
    return this.prisma.division.findFirst({ where: { id, competitionId } })
  }

  async create(competitionId: string, dto: CreateDivisionDto) {
    return this.prisma.division.create({
      data: { competitionId, name: dto.name, format: dto.format as any ?? null, maxEntries: dto.maxEntries ?? null, sortOrder: dto.sortOrder ?? 0 },
    })
  }

  async delete(id: string, competitionId: string) {
    await this.prisma.division.deleteMany({ where: { id, competitionId } })
  }
}
