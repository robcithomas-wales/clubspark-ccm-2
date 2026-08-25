import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateBookableUnitDto } from './dto/create-bookable-unit.dto.js'
import { Prisma } from '../generated/prisma/index.js'
import { OutboxRepository } from '../outbox/outbox.repository.js'
import type { VenueProjectionEvent } from '../event-bus/event-bus.service.js'

@Injectable()
export class BookableUnitsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

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

  async create(tenantId: string, dto: CreateBookableUnitDto) {
    const id = randomUUID()
    return this.prisma.write.$transaction(async (tx) => {
      const unit = await tx.bookableUnit.create({
        data: {
          id,
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

      if (dto.parentUnitId) await this.upsertParentConflict(tx, id, dto.parentUnitId)
      const sourceUpdatedAt = new Date().toISOString()
      await this.outbox.enqueue(tx, this.upsertEvent(unit, sourceUpdatedAt))
      await this.outbox.enqueue(
        tx,
        this.conflictsEvent(
          tenantId,
          id,
          dto.parentUnitId ? [dto.parentUnitId] : [],
          sourceUpdatedAt,
        ),
      )
      return unit
    })
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string
      unitType?: string
      sortOrder?: number
      capacity?: number | null
      isActive?: boolean
      isOptionalExtra?: boolean
      parentUnitId?: string | null
    },
  ) {
    const existing = await this.prisma.read.bookableUnit.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) return null

    return this.prisma.write.$transaction(async (tx) => {
      const unit = await tx.bookableUnit.update({
        where: { id, tenantId },
        data,
        select: this.unitSelect,
      })

      if ('parentUnitId' in data) {
        await tx.$executeRaw`
          DELETE FROM venue.unit_conflicts
          WHERE (unit_id = ${id}::uuid OR conflicting_unit_id = ${id}::uuid)
        `
        if (data.parentUnitId) await this.upsertParentConflict(tx, id, data.parentUnitId)
      }

      const conflictingUnitIds = await this.findConflictingUnitIdsInTx(tx, tenantId, id)
      const sourceUpdatedAt = new Date().toISOString()
      await this.outbox.enqueue(tx, this.upsertEvent(unit, sourceUpdatedAt))
      await this.outbox.enqueue(
        tx,
        this.conflictsEvent(tenantId, id, conflictingUnitIds, sourceUpdatedAt),
      )
      return unit
    })
  }

  private async upsertParentConflict(
    tx: Prisma.TransactionClient,
    childId: string,
    parentId: string,
  ) {
    await tx.$executeRaw`
      INSERT INTO venue.unit_conflicts (unit_id, conflicting_unit_id)
      VALUES (${childId}::uuid, ${parentId}::uuid)
      ON CONFLICT DO NOTHING
    `
  }

  async findConflictingUnitIds(tenantId: string, unitId: string): Promise<string[]> {
    return this.findConflictingUnitIdsInTx(this.prisma.read, tenantId, unitId)
  }

  private async findConflictingUnitIdsInTx(
    tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
    tenantId: string,
    unitId: string,
  ): Promise<string[]> {
    const rows = await tx.$queryRaw<{ conflicting_unit_id: string }[]>`
      SELECT DISTINCT
        CASE
          WHEN conflict.unit_id = ${unitId}::uuid THEN conflict.conflicting_unit_id
          ELSE conflict.unit_id
        END AS conflicting_unit_id
      FROM venue.unit_conflicts conflict
      JOIN venue.bookable_units requested
        ON requested.id = ${unitId}::uuid AND requested.tenant_id = ${tenantId}::uuid
      JOIN venue.bookable_units unit_row
        ON unit_row.id = conflict.unit_id AND unit_row.tenant_id = ${tenantId}::uuid
      JOIN venue.bookable_units conflicting_row
        ON conflicting_row.id = conflict.conflicting_unit_id
       AND conflicting_row.tenant_id = ${tenantId}::uuid
      WHERE conflict.unit_id = ${unitId}::uuid
         OR conflict.conflicting_unit_id = ${unitId}::uuid
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

  private upsertEvent(
    unit: {
      id: string
      tenantId: string
      venueId: string
      resourceId: string
      name: string
      unitType: string
      isActive: boolean
    },
    sourceUpdatedAt: string,
  ): VenueProjectionEvent {
    return {
      eventId: randomUUID(),
      type: 'venue.bookable-unit.upserted.v1',
      tenantId: unit.tenantId,
      occurredAt: sourceUpdatedAt,
      sourceUpdatedAt,
      data: {
        id: unit.id,
        venueId: unit.venueId,
        resourceId: unit.resourceId,
        name: unit.name,
        unitType: unit.unitType,
        isActive: unit.isActive,
      },
    }
  }

  private conflictsEvent(
    tenantId: string,
    id: string,
    conflictingUnitIds: string[],
    sourceUpdatedAt: string,
  ): VenueProjectionEvent {
    return {
      eventId: randomUUID(),
      type: 'venue.unit-conflicts.replaced.v1',
      tenantId,
      occurredAt: sourceUpdatedAt,
      sourceUpdatedAt,
      data: { id, conflictingUnitIds },
    }
  }
}
