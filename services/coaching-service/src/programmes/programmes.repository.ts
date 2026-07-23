import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateProgrammeDto } from './dto/create-programme.dto.js'
import type { UpdateProgrammeDto } from './dto/update-programme.dto.js'
import type { CreateProgrammeSessionDto } from './dto/create-programme-session.dto.js'

@Injectable()
export class ProgrammesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number, filters: { status?: string; sport?: string; coachId?: string }) {
    const offset = (page - 1) * limit
    const where: any = { tenantId }
    if (filters.status) where.status = filters.status
    if (filters.sport) where.sport = filters.sport
    if (filters.coachId) where.coachId = filters.coachId

    const [programmes, total] = await Promise.all([
      this.prisma.programme.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          coach: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { enrolments: true, sessions: true } },
        },
      }),
      this.prisma.programme.count({ where }),
    ])
    return { programmes, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.programme.findFirst({
      where: { id, tenantId },
      include: {
        coach: { select: { id: true, displayName: true, avatarUrl: true } },
        sessions: { orderBy: { startsAt: 'asc' }, include: { coach: { select: { id: true, displayName: true } } } },
        _count: { select: { enrolments: true } },
      },
    })
  }

  async create(tenantId: string, dto: CreateProgrammeDto) {
    return this.prisma.programme.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        sport: dto.sport ?? null,
        coachId: dto.coachId ?? null,
        venueId: dto.venueId ?? null,
        maxParticipants: dto.maxParticipants ?? 10,
        minParticipants: dto.minParticipants ?? 1,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'GBP',
        enrollsFrom: dto.enrollsFrom ? new Date(dto.enrollsFrom) : null,
        enrollsUntil: dto.enrollsUntil ? new Date(dto.enrollsUntil) : null,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateProgrammeDto) {
    return this.prisma.programme.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sport !== undefined && { sport: dto.sport }),
        ...(dto.coachId !== undefined && { coachId: dto.coachId }),
        ...(dto.venueId !== undefined && { venueId: dto.venueId }),
        ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
        ...(dto.minParticipants !== undefined && { minParticipants: dto.minParticipants }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.enrollsFrom !== undefined && { enrollsFrom: dto.enrollsFrom ? new Date(dto.enrollsFrom) : null }),
        ...(dto.enrollsUntil !== undefined && { enrollsUntil: dto.enrollsUntil ? new Date(dto.enrollsUntil) : null }),
      },
    })
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    return this.prisma.programme.update({ where: { id }, data: { status } })
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.programme.delete({ where: { id } })
  }

  // Sessions
  async createSession(tenantId: string, programmeId: string, dto: CreateProgrammeSessionDto) {
    return this.prisma.programmeSession.create({
      data: {
        tenantId,
        programmeId,
        coachId: dto.coachId ?? null,
        bookableUnitId: dto.bookableUnitId ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        notes: dto.notes ?? null,
      },
    })
  }

  async updateSession(id: string, data: { status?: string; notes?: string }) {
    return this.prisma.programmeSession.update({ where: { id }, data })
  }

  async deleteSession(id: string) {
    return this.prisma.programmeSession.delete({ where: { id } })
  }

  async findSession(tenantId: string, id: string) {
    return this.prisma.programmeSession.findFirst({ where: { id, tenantId } })
  }
}
