import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { VenueProjectionSnapshot } from '../venue/venue.client.js'
import type { VenueProjectionEventDto } from './dto/venue-projection-event.dto.js'
import type { CoachingOccupancySnapshot } from '../coaching/coaching.client.js'
import type { CoachingOccupancyEventDto } from './dto/coaching-occupancy-event.dto.js'

type ResourceEventData = {
  id: string
  venueId: string
  groupId: string | null
  hasLighting: boolean | null
  isActive: boolean
}

type UnitEventData = {
  id: string
  venueId: string
  resourceId: string
  name: string
  unitType: string
  isActive: boolean
}

export type VenueBookableUnitRead = UnitEventData & { tenantId: string }

@Injectable()
export class ProjectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceVenueSnapshot(tenantId: string, snapshot: VenueProjectionSnapshot) {
    const snapshotTime = new Date(snapshot.generatedAt)
    if (Number.isNaN(snapshotTime.getTime())) throw new Error('Invalid snapshot generatedAt')

    const resourceIds = new Set(snapshot.resources.map((resource) => resource.id))
    const unitIds = new Set(snapshot.bookableUnits.map((unit) => unit.id))
    for (const unit of snapshot.bookableUnits) {
      if (!resourceIds.has(unit.resourceId)) {
        throw new Error(`Snapshot unit ${unit.id} references missing resource ${unit.resourceId}`)
      }
    }
    for (const edge of snapshot.unitConflicts) {
      if (!unitIds.has(edge.unitId) || !unitIds.has(edge.conflictingUnitId)) {
        throw new Error('Snapshot conflict references a missing bookable unit')
      }
    }

    return this.prisma.write.$transaction(async (tx) => {
      await tx.unitConflictProjection.deleteMany({ where: { tenantId } })
      await tx.bookableUnitProjection.deleteMany({ where: { tenantId } })
      await tx.venueResourceProjection.deleteMany({ where: { tenantId } })
      await tx.projectionEntityCursor.deleteMany({ where: { tenantId, source: 'venue' } })

      if (snapshot.resources.length) {
        await tx.venueResourceProjection.createMany({
          data: snapshot.resources.map((resource) => ({
            tenantId,
            id: resource.id,
            venueId: resource.venueId,
            groupId: resource.groupId,
            hasLighting: resource.hasLighting,
            isActive: resource.isActive,
            sourceUpdatedAt: new Date(resource.updatedAt),
          })),
        })
      }
      if (snapshot.bookableUnits.length) {
        await tx.bookableUnitProjection.createMany({
          data: snapshot.bookableUnits.map((unit) => ({ ...unit, tenantId })),
        })
      }
      if (snapshot.unitConflicts.length) {
        await tx.unitConflictProjection.createMany({
          data: snapshot.unitConflicts.map((edge) => ({ ...edge, tenantId })),
          skipDuplicates: true,
        })
      }

      const cursors = [
        ...snapshot.resources.map((resource) => ({
          tenantId,
          source: 'venue',
          entityType: 'resource',
          entityId: resource.id,
          sourceUpdatedAt: snapshotTime,
        })),
        ...snapshot.bookableUnits.map((unit) => ({
          tenantId,
          source: 'venue',
          entityType: 'bookable-unit',
          entityId: unit.id,
          sourceUpdatedAt: snapshotTime,
        })),
      ]
      if (cursors.length) await tx.projectionEntityCursor.createMany({ data: cursors })

      return {
        resources: snapshot.resources.length,
        bookableUnits: snapshot.bookableUnits.length,
        unitConflicts: snapshot.unitConflicts.length,
        generatedAt: snapshot.generatedAt,
      }
    })
  }

  /**
   * Has this tenant's projection of `source` ever been populated?
   *
   * Every projection read returns "nothing found" for an un-backfilled tenant,
   * and for conflicts and coaching occupancy "nothing found" reads as "no
   * conflict" — i.e. the double-booking guard silently switches off. A read whose
   * failure mode is an overbooking must not treat emptiness as an answer, so the
   * `projection` path gates on a cursor existing for the source.
   */
  async isSourceProjected(tenantId: string, source: 'venue' | 'coaching'): Promise<boolean> {
    const cursor = await this.prisma.read.projectionEntityCursor.findFirst({
      where: { tenantId, source },
      select: { tenantId: true },
    })
    return cursor !== null
  }

  async status(tenantId: string) {
    const [
      resources,
      bookableUnits,
      unitConflicts,
      coachingOccupancies,
      latestCursor,
      latestVenueCursor,
      latestCoachingCursor,
    ] = await Promise.all([
      this.prisma.read.venueResourceProjection.count({ where: { tenantId } }),
      this.prisma.read.bookableUnitProjection.count({ where: { tenantId } }),
      this.prisma.read.unitConflictProjection.count({ where: { tenantId } }),
      this.prisma.read.coachingOccupancyProjection.count({ where: { tenantId } }),
      this.prisma.read.projectionEntityCursor.findFirst({
        where: { tenantId },
        orderBy: { projectedAt: 'desc' },
        select: { projectedAt: true },
      }),
      this.prisma.read.projectionEntityCursor.findFirst({
        where: { tenantId, source: 'venue' },
        orderBy: { projectedAt: 'desc' },
        select: { projectedAt: true },
      }),
      this.prisma.read.projectionEntityCursor.findFirst({
        where: { tenantId, source: 'coaching' },
        orderBy: { projectedAt: 'desc' },
        select: { projectedAt: true },
      }),
    ])
    const sourceStatus = (lastProjectedAt: Date | undefined) => ({
      lastProjectedAt: lastProjectedAt ?? null,
      ageSeconds: lastProjectedAt
        ? Math.max(0, Math.floor((Date.now() - lastProjectedAt.getTime()) / 1000))
        : null,
    })
    return {
      resources,
      bookableUnits,
      unitConflicts,
      coachingOccupancies,
      lastProjectedAt: latestCursor?.projectedAt ?? null,
      sources: {
        venue: sourceStatus(latestVenueCursor?.projectedAt),
        coaching: sourceStatus(latestCoachingCursor?.projectedAt),
      },
    }
  }

  async reconcile(
    tenantId: string,
    venue: VenueProjectionSnapshot,
    coaching: CoachingOccupancySnapshot,
  ) {
    const [resources, units, conflicts, occupancies] = await Promise.all([
      this.prisma.read.venueResourceProjection.findMany({
        where: { tenantId },
        select: { id: true, venueId: true, groupId: true, hasLighting: true, isActive: true },
      }),
      this.prisma.read.bookableUnitProjection.findMany({
        where: { tenantId },
        select: {
          id: true,
          venueId: true,
          resourceId: true,
          name: true,
          unitType: true,
          isActive: true,
        },
      }),
      this.prisma.read.unitConflictProjection.findMany({
        where: { tenantId },
        select: { unitId: true, conflictingUnitId: true },
      }),
      this.prisma.read.coachingOccupancyProjection.findMany({
        where: { tenantId },
        select: {
          id: true,
          bookableUnitId: true,
          startsAt: true,
          endsAt: true,
          status: true,
        },
      }),
    ])

    const compare = <T extends { id: string }>(
      source: T[],
      projected: T[],
      normalise: (value: T) => string = (value) => JSON.stringify(value),
    ) => {
      const sourceMap = new Map(source.map((row) => [row.id, normalise(row)]))
      const projectedMap = new Map(projected.map((row) => [row.id, normalise(row)]))
      const mismatches = [...new Set([...sourceMap.keys(), ...projectedMap.keys()])]
        .filter((id) => sourceMap.get(id) !== projectedMap.get(id))
        .sort()
      return {
        sourceCount: source.length,
        projectionCount: projected.length,
        mismatchCount: mismatches.length,
        mismatchIds: mismatches.slice(0, 50),
      }
    }

    const edgeRows = (rows: Array<{ unitId: string; conflictingUnitId: string }>) =>
      rows.map((row) => ({
        id: `${row.unitId}:${row.conflictingUnitId}`,
        unitId: row.unitId,
        conflictingUnitId: row.conflictingUnitId,
      }))
    const report = {
      resources: compare(
        venue.resources.map(({ updatedAt: _updatedAt, ...row }) => row),
        resources,
      ),
      bookableUnits: compare(venue.bookableUnits, units),
      unitConflicts: compare(edgeRows(venue.unitConflicts), edgeRows(conflicts)),
      coachingOccupancies: compare(
        coaching.occupancies.map(({ updatedAt: _updatedAt, ...row }) => row),
        occupancies.map((row) => ({
          ...row,
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt.toISOString(),
        })),
      ),
    }
    return {
      reconciledAt: new Date().toISOString(),
      matches: Object.values(report).every((item) => item.mismatchCount === 0),
      ...report,
    }
  }

  async replaceCoachingSnapshot(tenantId: string, snapshot: CoachingOccupancySnapshot) {
    const snapshotTime = new Date(snapshot.generatedAt)
    if (Number.isNaN(snapshotTime.getTime())) throw new Error('Invalid snapshot generatedAt')
    return this.prisma.write.$transaction(async (tx) => {
      await tx.coachingOccupancyProjection.deleteMany({ where: { tenantId } })
      await tx.projectionEntityCursor.deleteMany({ where: { tenantId, source: 'coaching' } })
      if (snapshot.occupancies.length) {
        await tx.coachingOccupancyProjection.createMany({
          data: snapshot.occupancies.map((row) => ({
            tenantId,
            id: row.id,
            bookableUnitId: row.bookableUnitId,
            startsAt: new Date(row.startsAt),
            endsAt: new Date(row.endsAt),
            status: row.status,
            sourceUpdatedAt: new Date(row.updatedAt),
          })),
        })
        await tx.projectionEntityCursor.createMany({
          data: snapshot.occupancies.map((row) => ({
            tenantId,
            source: 'coaching',
            entityType: 'occupancy',
            entityId: row.id,
            sourceUpdatedAt: snapshotTime,
          })),
        })
      }
      return { occupancies: snapshot.occupancies.length, generatedAt: snapshot.generatedAt }
    })
  }

  async findVenueBookableUnit(tenantId: string, bookableUnitId: string) {
    return this.prisma.read.bookableUnitProjection.findUnique({
      where: { tenantId_id: { tenantId, id: bookableUnitId } },
      select: {
        id: true,
        tenantId: true,
        venueId: true,
        resourceId: true,
        name: true,
        unitType: true,
        isActive: true,
      },
    })
  }

  async findVenueResourceGroupId(tenantId: string, resourceId: string): Promise<string | null> {
    const resource = await this.prisma.read.venueResourceProjection.findUnique({
      where: { tenantId_id: { tenantId, id: resourceId } },
      select: { groupId: true },
    })
    return resource?.groupId ?? null
  }

  async getVenueResourceLighting(tenantId: string, resourceId: string): Promise<boolean> {
    const resource = await this.prisma.read.venueResourceProjection.findUnique({
      where: { tenantId_id: { tenantId, id: resourceId } },
      select: { hasLighting: true },
    })
    return resource?.hasLighting === true
  }

  async getVenueConflictMap(tenantId: string, unitIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map(unitIds.map((id) => [id, [id]]))
    if (unitIds.length === 0) return map

    const rows = await this.prisma.read.unitConflictProjection.findMany({
      where: {
        tenantId,
        OR: [{ unitId: { in: unitIds } }, { conflictingUnitId: { in: unitIds } }],
      },
      select: { unitId: true, conflictingUnitId: true },
    })
    for (const row of rows) {
      const left = map.get(row.unitId)
      if (left && !left.includes(row.conflictingUnitId)) left.push(row.conflictingUnitId)
      const right = map.get(row.conflictingUnitId)
      if (right && !right.includes(row.unitId)) right.push(row.unitId)
    }
    return map
  }

  async getCoachingConflicts(
    tenantId: string,
    unitIds: string[],
    startsAt: string,
    endsAt: string,
  ) {
    if (!unitIds.length) return []
    return this.prisma.read.coachingOccupancyProjection.findMany({
      where: {
        tenantId,
        status: { not: 'cancelled' },
        bookableUnitId: { in: unitIds },
        startsAt: { lt: new Date(endsAt) },
        endsAt: { gt: new Date(startsAt) },
      },
      select: { id: true },
    })
  }

  async applyCoachingEvent(event: CoachingOccupancyEventDto) {
    const sourceUpdatedAt = new Date(event.sourceUpdatedAt)
    const id = event.data['id'] as string
    return this.prisma.write.$transaction(async (tx) => {
      const receipt = await tx.projectionEventReceipt.createMany({
        data: {
          tenantId: event.tenantId,
          eventId: event.eventId,
          eventType: event.type,
          occurredAt: new Date(event.occurredAt),
        },
        skipDuplicates: true,
      })
      if (!receipt.count) return { applied: false, reason: 'duplicate' as const }
      const cursorKey = {
        tenantId_source_entityType_entityId: {
          tenantId: event.tenantId,
          source: 'coaching',
          entityType: 'occupancy',
          entityId: id,
        },
      }
      const cursor = await tx.projectionEntityCursor.findUnique({ where: cursorKey })
      if (cursor && cursor.sourceUpdatedAt >= sourceUpdatedAt) {
        return { applied: false, reason: 'stale' as const }
      }

      const deleted = event.type === 'coaching.occupancy.deleted.v1'
      if (deleted) {
        await tx.coachingOccupancyProjection.deleteMany({ where: { tenantId: event.tenantId, id } })
      } else {
        const data = event.data as {
          id: string
          bookableUnitId: string
          startsAt: string
          endsAt: string
          status: string
        }
        await tx.coachingOccupancyProjection.upsert({
          where: { tenantId_id: { tenantId: event.tenantId, id } },
          create: {
            tenantId: event.tenantId,
            id,
            bookableUnitId: data.bookableUnitId,
            startsAt: new Date(data.startsAt),
            endsAt: new Date(data.endsAt),
            status: data.status,
            sourceUpdatedAt,
          },
          update: {
            bookableUnitId: data.bookableUnitId,
            startsAt: new Date(data.startsAt),
            endsAt: new Date(data.endsAt),
            status: data.status,
            sourceUpdatedAt,
            projectedAt: new Date(),
          },
        })
      }
      await tx.projectionEntityCursor.upsert({
        where: cursorKey,
        create: {
          tenantId: event.tenantId,
          source: 'coaching',
          entityType: 'occupancy',
          entityId: id,
          sourceUpdatedAt,
          deleted,
        },
        update: { sourceUpdatedAt, deleted, projectedAt: new Date() },
      })
      return { applied: true, reason: 'updated' as const }
    })
  }

  async applyVenueEvent(event: VenueProjectionEventDto) {
    const sourceUpdatedAt = new Date(event.sourceUpdatedAt)
    const entity = this.eventEntity(event)

    return this.prisma.write.$transaction(async (tx) => {
      const receipt = await tx.projectionEventReceipt.createMany({
        data: {
          tenantId: event.tenantId,
          eventId: event.eventId,
          eventType: event.type,
          occurredAt: new Date(event.occurredAt),
        },
        skipDuplicates: true,
      })
      if (receipt.count === 0) return { applied: false, reason: 'duplicate' as const }

      const cursorKey = {
        tenantId_source_entityType_entityId: {
          tenantId: event.tenantId,
          source: 'venue',
          entityType: entity.type,
          entityId: entity.id,
        },
      }
      const cursor = await tx.projectionEntityCursor.findUnique({ where: cursorKey })
      if (cursor && cursor.sourceUpdatedAt >= sourceUpdatedAt) {
        return { applied: false, reason: 'stale' as const }
      }

      let deleted = false
      switch (event.type) {
        case 'venue.resource.upserted.v1': {
          const data = event.data as ResourceEventData
          // Destructure rather than spread `event.data`. Spreading let a payload
          // key set a column that is not the producer's to set — `tenantId` most
          // of all, which would relocate the row into another tenant and defeat
          // the header-vs-body tenant check on this same request.
          const fields = {
            venueId: data.venueId,
            groupId: data.groupId,
            hasLighting: data.hasLighting,
            isActive: data.isActive,
          }
          await tx.venueResourceProjection.upsert({
            where: {
              tenantId_id: { tenantId: event.tenantId, id: data.id },
            },
            create: { ...fields, id: data.id, tenantId: event.tenantId, sourceUpdatedAt },
            update: {
              ...fields,
              tenantId: event.tenantId,
              sourceUpdatedAt,
              projectedAt: new Date(),
            },
          })
          break
        }
        case 'venue.resource.deleted.v1': {
          deleted = true
          await tx.venueResourceProjection.deleteMany({
            where: { tenantId: event.tenantId, id: entity.id },
          })
          break
        }
        case 'venue.bookable-unit.upserted.v1': {
          const data = event.data as UnitEventData
          const fields = {
            venueId: data.venueId,
            resourceId: data.resourceId,
            name: data.name,
            unitType: data.unitType,
            isActive: data.isActive,
          }
          await tx.bookableUnitProjection.upsert({
            where: {
              tenantId_id: { tenantId: event.tenantId, id: data.id },
            },
            create: { ...fields, id: data.id, tenantId: event.tenantId, sourceUpdatedAt },
            update: {
              ...fields,
              tenantId: event.tenantId,
              sourceUpdatedAt,
              projectedAt: new Date(),
            },
          })
          break
        }
        case 'venue.bookable-unit.deleted.v1': {
          deleted = true
          await tx.unitConflictProjection.deleteMany({
            where: {
              tenantId: event.tenantId,
              OR: [{ unitId: entity.id }, { conflictingUnitId: entity.id }],
            },
          })
          await tx.bookableUnitProjection.deleteMany({
            where: { tenantId: event.tenantId, id: entity.id },
          })
          break
        }
        case 'venue.unit-conflicts.replaced.v1': {
          const conflictingUnitIds = event.data['conflictingUnitIds'] as string[]
          await tx.unitConflictProjection.deleteMany({
            where: {
              tenantId: event.tenantId,
              OR: [{ unitId: entity.id }, { conflictingUnitId: entity.id }],
            },
          })
          const edges = conflictingUnitIds
            .filter((id) => id !== entity.id)
            .map((id) =>
              entity.id < id
                ? { tenantId: event.tenantId, unitId: entity.id, conflictingUnitId: id }
                : { tenantId: event.tenantId, unitId: id, conflictingUnitId: entity.id },
            )
          if (edges.length) {
            await tx.unitConflictProjection.createMany({ data: edges, skipDuplicates: true })
          }
          break
        }
      }

      await tx.projectionEntityCursor.upsert({
        where: cursorKey,
        create: {
          tenantId: event.tenantId,
          source: 'venue',
          entityType: entity.type,
          entityId: entity.id,
          sourceUpdatedAt,
          deleted,
        },
        update: { sourceUpdatedAt, deleted, projectedAt: new Date() },
      })
      return { applied: true, reason: 'updated' as const }
    })
  }

  private eventEntity(event: VenueProjectionEventDto): { type: string; id: string } {
    const id = event.data['id']
    if (typeof id !== 'string' || !id) throw new Error('Projection event data.id is required')
    if (event.type.startsWith('venue.resource.')) return { type: 'resource', id }
    if (event.type === 'venue.unit-conflicts.replaced.v1') {
      return { type: 'bookable-unit-conflicts', id }
    }
    return { type: 'bookable-unit', id }
  }
}
