import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateDisciplineCaseDto } from './dto/create-case.dto.js'
import type { CreateDisciplineActionDto } from './dto/create-action.dto.js'
import type { UpdateDisciplineCaseDto } from './dto/update-case.dto.js'

@Injectable()
export class DisciplineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCases(tenantId: string, competitionId?: string, personId?: string) {
    return this.prisma.disciplineCase.findMany({
      where: {
        tenantId,
        ...(competitionId ? { competitionId } : {}),
        ...(personId ? { personId } : {}),
      },
      include: { actions: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findCase(id: string, tenantId: string) {
    return this.prisma.disciplineCase.findFirst({
      where: { id, tenantId },
      include: { actions: true },
    })
  }

  async createCase(tenantId: string, createdBy: string | undefined, dto: CreateDisciplineCaseDto) {
    return this.prisma.disciplineCase.create({
      data: {
        tenantId,
        competitionId: dto.competitionId ?? null,
        matchId: dto.matchId ?? null,
        personId: dto.personId ?? null,
        teamId: dto.teamId ?? null,
        displayName: dto.displayName,
        description: dto.description,
        createdBy: createdBy ?? null,
      },
      include: { actions: true },
    })
  }

  async updateCase(id: string, tenantId: string, actorId: string | undefined, dto: UpdateDisciplineCaseDto) {
    const data: any = {}
    if (dto.status !== undefined) {
      data.status = dto.status
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
        data.resolvedAt = new Date()
        data.resolvedBy = actorId ?? null
      }
    }
    if (dto.description !== undefined) data.description = dto.description
    return this.prisma.disciplineCase.update({
      where: { id },
      data,
      include: { actions: true },
    })
  }

  async addAction(caseId: string, issuedBy: string | undefined, dto: CreateDisciplineActionDto) {
    return this.prisma.disciplineAction.create({
      data: {
        caseId,
        outcome: dto.outcome as any,
        banMatches: dto.banMatches ?? null,
        suspendedUntil: dto.suspendedUntil ? new Date(dto.suspendedUntil) : null,
        fineAmount: dto.fineAmount ?? null,
        notes: dto.notes ?? null,
        issuedBy: issuedBy ?? null,
      },
    })
  }
}
