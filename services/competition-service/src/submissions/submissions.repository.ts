import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class SubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, competitionId?: string) {
    return this.prisma.tournamentSubmission.findMany({
      where: { tenantId, ...(competitionId ? { competitionId } : {}) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.tournamentSubmission.findFirst({ where: { id, tenantId } })
  }

  async create(tenantId: string, submittedBy: string | undefined, competitionId: string, governingBody: string | undefined) {
    // Snapshot the competition data at time of submission
    const competition = await this.prisma.competition.findFirst({
      where: { id: competitionId, tenantId },
      include: { divisions: true },
    })

    return this.prisma.tournamentSubmission.create({
      data: {
        tenantId,
        competitionId,
        submittedBy: submittedBy ?? null,
        submittedAt: new Date(),
        status: 'SUBMITTED',
        governingBody: governingBody ?? null,
        submissionData: competition ? (competition as any) : undefined,
      },
    })
  }

  async acknowledge(id: string, externalRef?: string, responseData?: any) {
    return this.prisma.tournamentSubmission.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        externalRef: externalRef ?? null,
        responseData: responseData ?? undefined,
      },
    })
  }

  async reject(id: string, reason: string) {
    return this.prisma.tournamentSubmission.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    })
  }
}
