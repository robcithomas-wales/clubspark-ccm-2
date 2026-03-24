import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Get the full availability dashboard for a fixture (all roster members + their response)
  async getForFixture(tenantId: string, fixtureId: string) {
    return this.prisma.availabilityResponse.findMany({
      where: { fixtureId, teamMember: { tenantId } },
      include: { teamMember: true },
      orderBy: [{ response: 'asc' }, { teamMember: { displayName: 'asc' } }],
    })
  }

  // Upsert a single player's response
  async upsertResponse(fixtureId: string, teamMemberId: string, response: string, notes?: string) {
    return this.prisma.availabilityResponse.upsert({
      where: { fixtureId_teamMemberId: { fixtureId, teamMemberId } },
      create: {
        fixtureId,
        teamMemberId,
        response: response as any,
        respondedAt: new Date(),
        notes: notes ?? null,
      },
      update: {
        response: response as any,
        respondedAt: new Date(),
        notes: notes ?? null,
      },
      include: { teamMember: true },
    })
  }

  // Bulk-create no_response entries for all active roster members who don't yet have one
  async requestForAllMembers(fixtureId: string, teamId: string, tenantId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, tenantId, isActive: true },
    })

    const existing = await this.prisma.availabilityResponse.findMany({
      where: { fixtureId, teamMember: { teamId } },
      select: { teamMemberId: true },
    })
    const existingIds = new Set(existing.map((e) => e.teamMemberId))

    const toCreate = members
      .filter((m) => !existingIds.has(m.id))
      .map((m) => ({ fixtureId, teamMemberId: m.id, response: 'no_response' as const }))

    if (toCreate.length > 0) {
      await this.prisma.availabilityResponse.createMany({ data: toCreate, skipDuplicates: true })
    }

    return this.getForFixture(tenantId, fixtureId)
  }
}
