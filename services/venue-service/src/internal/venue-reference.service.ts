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
}
