import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { SelectionEntryDto } from './dto/set-selection.dto.js'

@Injectable()
export class SelectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getForFixture(fixtureId: string) {
    return this.prisma.selection.findMany({
      where: { fixtureId },
      include: { teamMember: true },
      orderBy: [{ role: 'asc' }, { shirtNumber: 'asc' }, { teamMember: { displayName: 'asc' } }],
    })
  }

  // Replace the full selection for a fixture in one transaction
  async setSelection(fixtureId: string, players: SelectionEntryDto[], publish: boolean) {
    const publishedAt = publish ? new Date() : null

    return this.prisma.$transaction(async (tx) => {
      // Wipe existing selection for this fixture
      await tx.selection.deleteMany({ where: { fixtureId } })

      if (players.length > 0) {
        await tx.selection.createMany({
          data: players.map((p) => ({
            fixtureId,
            teamMemberId: p.teamMemberId,
            role: p.role as any,
            position: p.position ?? null,
            shirtNumber: p.shirtNumber ?? null,
            publishedAt,
          })),
        })
      }

      return tx.selection.findMany({
        where: { fixtureId },
        include: { teamMember: true },
        orderBy: [{ role: 'asc' }, { shirtNumber: 'asc' }],
      })
    })
  }

  async publish(fixtureId: string) {
    const now = new Date()
    await this.prisma.selection.updateMany({
      where: { fixtureId, publishedAt: null },
      data: { publishedAt: now },
    })
    return this.getForFixture(fixtureId)
  }
}
