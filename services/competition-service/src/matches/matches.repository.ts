import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpdateMatchDto } from './dto/update-match.dto.js'

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(competitionId: string, divisionId?: string, round?: number) {
    const where: any = { competitionId, ...(divisionId ? { divisionId } : {}), ...(round ? { round } : {}) }
    return this.prisma.match.findMany({
      where, orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
      include: { homeEntry: true, awayEntry: true },
    })
  }

  async findById(id: string, competitionId: string) {
    return this.prisma.match.findFirst({
      where: { id, competitionId },
      include: { homeEntry: true, awayEntry: true },
    })
  }

  async update(id: string, data: any) {
    await this.prisma.match.update({ where: { id }, data })
    return this.prisma.match.findFirst({ where: { id }, include: { homeEntry: true, awayEntry: true } })
  }

  async getVerifiedMatchesForStandings(competitionId: string, divisionId: string) {
    return this.prisma.match.findMany({
      where: {
        competitionId, divisionId,
        status: 'COMPLETED',
        OR: [{ resultStatus: 'VERIFIED' }, { verifiedAt: { not: null } }],
      },
    })
  }
}
