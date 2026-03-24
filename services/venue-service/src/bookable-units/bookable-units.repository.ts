import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateBookableUnitDto } from './dto/create-bookable-unit.dto.js'

@Injectable()
export class BookableUnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly unitSelect = {
    id: true,
    tenantId: true,
    venueId: true,
    resourceId: true,
    parentUnitId: true,
    name: true,
    unitType: true,
    sortOrder: true,
    capacity: true,
    isActive: true,
    isOptionalExtra: true,
  } as const

  findAll(tenantId: string) {
    return this.prisma.read.bookableUnit.findMany({
      where: { tenantId },
      orderBy: [{ resourceId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: this.unitSelect,
    })
  }

  findByVenue(tenantId: string, venueId: string) {
    return this.prisma.read.bookableUnit.findMany({
      where: { tenantId, venueId, isActive: true },
      orderBy: [{ resourceId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: this.unitSelect,
    })
  }

  create(tenantId: string, dto: CreateBookableUnitDto) {
    return this.prisma.write.bookableUnit.create({
      data: {
        id: randomUUID(),
        tenantId,
        venueId: dto.venueId,
        resourceId: dto.resourceId,
        name: dto.name,
        unitType: dto.unitType,
        sortOrder: dto.sortOrder ?? 0,
        capacity: dto.capacity ?? null,
        isActive: dto.isActive ?? true,
        isOptionalExtra: dto.isOptionalExtra ?? false,
        parentUnitId: dto.parentUnitId ?? null,
      },
      select: this.unitSelect,
    })
  }

  async findConflictingUnitIds(unitId: string): Promise<string[]> {
    const rows = await this.prisma.read.$queryRaw<{ conflicting_unit_id: string }[]>`
      SELECT DISTINCT
        CASE
          WHEN unit_id = ${unitId}::uuid THEN conflicting_unit_id
          ELSE unit_id
        END AS conflicting_unit_id
      FROM venue.unit_conflicts
      WHERE unit_id = ${unitId}::uuid
         OR conflicting_unit_id = ${unitId}::uuid
    `
    return rows.map((r) => r.conflicting_unit_id)
  }

  findBySport(tenantId: string, sport: string) {
    return this.prisma.read.bookableUnit.findMany({
      where: { tenantId, isActive: true, resource: { sport } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { resource: { select: { id: true, name: true, sport: true, venueId: true } } },
    })
  }

}
