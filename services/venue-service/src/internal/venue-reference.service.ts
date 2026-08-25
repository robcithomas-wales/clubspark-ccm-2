import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { VenueReferenceDto } from './venue-reference.controller.js'

/**
 * Reference lookups for other services. Returns only the display fields callers
 * actually render — never whole rows, so this stays a narrow, stable contract
 * rather than an accidental view onto venue's schema.
 */
@Injectable()
export class VenueReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(tenantId: string, dto: VenueReferenceDto) {
    const uniq = (xs?: string[]) => [...new Set((xs ?? []).filter(Boolean))]
    const venueIds = uniq(dto.venueIds)
    const resourceIds = uniq(dto.resourceIds)
    const unitIds = uniq(dto.bookableUnitIds)

    // Issued together — the caller needs all three to render one row.
    const [venues, resources, bookableUnits] = await Promise.all([
      venueIds.length
        ? this.prisma.read.venue.findMany({
            where: { tenantId, id: { in: venueIds } },
            select: { id: true, name: true },
          })
        : [],
      resourceIds.length
        ? this.prisma.read.resource.findMany({
            where: { tenantId, id: { in: resourceIds } },
            select: { id: true, name: true },
          })
        : [],
      unitIds.length
        ? this.prisma.read.bookableUnit.findMany({
            where: { tenantId, id: { in: unitIds } },
            select: { id: true, name: true },
          })
        : [],
    ])

    return { data: { venues, resources, bookableUnits } }
  }

  async activeBookableUnitCount(tenantId: string) {
    const count = await this.prisma.read.bookableUnit.count({
      where: { tenantId, isActive: true },
    })
    return { data: { count } }
  }

  async bookingProjectionSnapshot(tenantId: string) {
    // The watermark must come from the SAME clock as the row timestamps it will
    // be compared against. Row `updatedAt` is Prisma's client-generated value and
    // live events stamp `sourceUpdatedAt` from this process, so a database
    // `transaction_timestamp()` watermark mixed two clocks: if this host's clock
    // trailed the database's, every mutation made after a backfill was judged
    // "stale" by the consumer, dropped, and never retried.
    const generatedAt = new Date()
    return this.prisma.read.$transaction(
      async (tx) => {
        const [resources, bookableUnits, rawConflicts] = await Promise.all([
          tx.resource.findMany({
            where: { tenantId },
            select: {
              id: true,
              venueId: true,
              groupId: true,
              hasLighting: true,
              isActive: true,
              updatedAt: true,
            },
          }),
          tx.bookableUnit.findMany({
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
          tx.$queryRaw<{ unitId: string; conflictingUnitId: string }[]>`
            SELECT uc.unit_id AS "unitId", uc.conflicting_unit_id AS "conflictingUnitId"
            FROM venue.unit_conflicts uc
            JOIN venue.bookable_units unit_row
              ON unit_row.id = uc.unit_id AND unit_row.tenant_id = ${tenantId}::uuid
            JOIN venue.bookable_units conflicting_row
              ON conflicting_row.id = uc.conflicting_unit_id
             AND conflicting_row.tenant_id = ${tenantId}::uuid
          `,
        ])

        const unitConflicts = rawConflicts.map((row) =>
          row.unitId < row.conflictingUnitId
            ? row
            : { unitId: row.conflictingUnitId, conflictingUnitId: row.unitId },
        )

        return {
          data: {
            generatedAt: generatedAt.toISOString(),
            resources,
            bookableUnits,
            unitConflicts,
          },
        }
      },
      { isolationLevel: 'RepeatableRead' },
    )
  }
}
