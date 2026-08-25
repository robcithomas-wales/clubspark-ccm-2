import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateSessionDto } from './dto/create-session.dto.js'
import type { UpdateSessionDto } from './dto/update-session.dto.js'
import { randomUUID } from 'node:crypto'
import { OutboxRepository } from '../outbox/outbox.repository.js'
import type { CoachingOccupancyEvent } from '../event-bus/event-bus.service.js'

@Injectable()
export class SessionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

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
        lessonType: {
          select: {
            id: true,
            name: true,
            sport: true,
            durationMinutes: true,
            pricePerSession: true,
          },
        },
      },
    })
  }

  async create(tenantId: string, dto: CreateSessionDto) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.lessonSession.create({
        data: {
          tenantId,
          coachId: dto.coachId,
          lessonTypeId: dto.lessonTypeId,
          customerId: dto.customerId ?? null,
          bookableUnitId: dto.bookableUnitId ?? null,
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
      if (session.bookableUnitId) await this.outbox.enqueue(tx, this.upsertEvent(session))
      return session
    })
  }

  async update(tenantId: string, id: string, dto: UpdateSessionDto) {
    return this.prisma.$transaction(async (tx) => {
      // Scope the write itself, inside the transaction. The service layer's
      // findById check is a separate statement outside it, so it cannot stop a
      // cross-tenant write — and an unscoped write emits the projection event
      // under the victim's tenant.
      const session = await tx.lessonSession.update({
        where: { id, tenantId },
        data: {
          ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
          ...(dto.endsAt !== undefined && { endsAt: new Date(dto.endsAt) }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.paymentStatus !== undefined && { paymentStatus: dto.paymentStatus }),
          ...(dto.priceCharged !== undefined && { priceCharged: dto.priceCharged }),
          ...(dto.cancellationReason !== undefined && {
            cancellationReason: dto.cancellationReason,
          }),
        },
        include: {
          coach: { select: { id: true, displayName: true } },
          lessonType: { select: { id: true, name: true } },
        },
      })
      if (session.bookableUnitId) await this.outbox.enqueue(tx, this.upsertEvent(session))
      return session
    })
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.lessonSession.delete({ where: { id, tenantId } })
      if (session.bookableUnitId) {
        const now = new Date().toISOString()
        await this.outbox.enqueue(tx, {
          eventId: randomUUID(),
          type: 'coaching.occupancy.deleted.v1',
          // From the row, not the request: a tombstone must land in the tenant
          // whose projection actually holds the row.
          tenantId: session.tenantId,
          occurredAt: now,
          sourceUpdatedAt: now,
          data: { id },
        })
      }
      return session
    })
  }

  private upsertEvent(session: {
    id: string
    tenantId: string
    bookableUnitId: string | null
    startsAt: Date
    endsAt: Date
    status: string
    updatedAt: Date
  }): CoachingOccupancyEvent {
    return {
      eventId: randomUUID(),
      type: 'coaching.occupancy.upserted.v1',
      tenantId: session.tenantId,
      occurredAt: new Date().toISOString(),
      sourceUpdatedAt: session.updatedAt.toISOString(),
      data: {
        id: session.id,
        bookableUnitId: session.bookableUnitId,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        status: session.status,
      },
    }
  }
}
