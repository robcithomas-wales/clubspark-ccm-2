import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateSessionDto } from './dto/create-session.dto.js'
import type { UpdateSessionDto } from './dto/update-session.dto.js'

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    opts: {
      coachId?: string
      lessonTypeId?: string
      customerId?: string
      status?: string
      fromDate?: string
      toDate?: string
      page: number
      limit: number
    },
  ) {
    const offset = (opts.page - 1) * opts.limit
    const where: any = { tenantId }
    if (opts.coachId) where.coachId = opts.coachId
    if (opts.lessonTypeId) where.lessonTypeId = opts.lessonTypeId
    if (opts.customerId) where.customerId = opts.customerId
    if (opts.status) where.status = opts.status
    if (opts.fromDate || opts.toDate) {
      where.startsAt = {}
      if (opts.fromDate) where.startsAt.gte = new Date(opts.fromDate)
      if (opts.toDate) where.startsAt.lte = new Date(opts.toDate)
    }

    const [sessions, total] = await Promise.all([
      this.prisma.lessonSession.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        skip: offset,
        take: opts.limit,
        include: {
          coach: { select: { id: true, displayName: true, avatarUrl: true } },
          lessonType: { select: { id: true, name: true, sport: true, durationMinutes: true } },
        },
      }),
      this.prisma.lessonSession.count({ where }),
    ])

    return { sessions, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.lessonSession.findFirst({
      where: { id, tenantId },
      include: {
        coach: { select: { id: true, displayName: true, avatarUrl: true } },
        lessonType: { select: { id: true, name: true, sport: true, durationMinutes: true, pricePerSession: true } },
      },
    })
  }

  async create(tenantId: string, dto: CreateSessionDto) {
    return this.prisma.lessonSession.create({
      data: {
        tenantId,
        coachId: dto.coachId,
        lessonTypeId: dto.lessonTypeId,
        customerId: dto.customerId ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        notes: dto.notes ?? null,
        paymentStatus: dto.paymentStatus ?? 'unpaid',
        priceCharged: dto.priceCharged != null ? dto.priceCharged : null,
      },
      include: {
        coach: { select: { id: true, displayName: true } },
        lessonType: { select: { id: true, name: true, sport: true } },
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateSessionDto) {
    return this.prisma.lessonSession.update({
      where: { id },
      data: {
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: new Date(dto.endsAt) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.paymentStatus !== undefined && { paymentStatus: dto.paymentStatus }),
        ...(dto.priceCharged !== undefined && { priceCharged: dto.priceCharged }),
        ...(dto.cancellationReason !== undefined && { cancellationReason: dto.cancellationReason }),
      },
      include: {
        coach: { select: { id: true, displayName: true } },
        lessonType: { select: { id: true, name: true } },
      },
    })
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.lessonSession.delete({ where: { id } })
  }
}
