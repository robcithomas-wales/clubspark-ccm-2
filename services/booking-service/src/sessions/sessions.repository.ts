import { Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/index.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateSessionDto } from './dto/create-session.dto.js'
import type { JoinSessionDto } from './dto/join-session.dto.js'

export interface SessionRow {
  id: string
  tenantId: string
  organisationId: string | null
  venueId: string
  resourceId: string
  bookableUnitId: string
  name: string
  description: string | null
  startsAt: Date
  endsAt: Date
  pricePerParticipant: number | null
  currency: string
  minParticipants: number | null
  maxParticipants: number | null
  status: string
  coachId: string | null
  notes: string | null
  participantCount: number
  createdAt: Date
  updatedAt: Date
}

export interface ParticipantRow {
  id: string
  sessionId: string
  tenantId: string
  customerId: string | null
  participantName: string
  participantEmail: string | null
  status: string
  paymentStatus: string
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    filters: { status?: string; upcoming?: boolean } = {},
  ): Promise<SessionRow[]> {
    const statusFilter = filters.status
      ? Prisma.sql`AND s.status = ${filters.status}`
      : Prisma.sql``
    const upcomingFilter = filters.upcoming
      ? Prisma.sql`AND s.starts_at >= NOW()`
      : Prisma.sql``

    return this.prisma.read.$queryRaw<SessionRow[]>`
      SELECT
        s.id, s.tenant_id AS "tenantId", s.organisation_id AS "organisationId",
        s.venue_id AS "venueId", s.resource_id AS "resourceId",
        s.bookable_unit_id AS "bookableUnitId",
        s.name, s.description,
        s.starts_at AS "startsAt", s.ends_at AS "endsAt",
        s.price_per_participant::float AS "pricePerParticipant",
        s.currency,
        s.min_participants AS "minParticipants",
        s.max_participants AS "maxParticipants",
        s.status, s.coach_id AS "coachId", s.notes,
        COUNT(p.id) FILTER (WHERE p.status <> 'cancelled') AS "participantCount",
        s.created_at AS "createdAt", s.updated_at AS "updatedAt"
      FROM booking.sessions s
      LEFT JOIN booking.session_participants p ON p.session_id = s.id
      WHERE s.tenant_id = ${tenantId}::uuid
        ${statusFilter}
        ${upcomingFilter}
      GROUP BY s.id
      ORDER BY s.starts_at ASC
    `
  }

  async findById(tenantId: string, id: string): Promise<SessionRow | null> {
    const rows = await this.prisma.read.$queryRaw<SessionRow[]>`
      SELECT
        s.id, s.tenant_id AS "tenantId", s.organisation_id AS "organisationId",
        s.venue_id AS "venueId", s.resource_id AS "resourceId",
        s.bookable_unit_id AS "bookableUnitId",
        s.name, s.description,
        s.starts_at AS "startsAt", s.ends_at AS "endsAt",
        s.price_per_participant::float AS "pricePerParticipant",
        s.currency,
        s.min_participants AS "minParticipants",
        s.max_participants AS "maxParticipants",
        s.status, s.coach_id AS "coachId", s.notes,
        COUNT(p.id) FILTER (WHERE p.status <> 'cancelled') AS "participantCount",
        s.created_at AS "createdAt", s.updated_at AS "updatedAt"
      FROM booking.sessions s
      LEFT JOIN booking.session_participants p ON p.session_id = s.id
      WHERE s.tenant_id = ${tenantId}::uuid AND s.id = ${id}::uuid
      GROUP BY s.id
    `
    return rows[0] ?? null
  }

  async findParticipants(sessionId: string): Promise<ParticipantRow[]> {
    return this.prisma.read.$queryRaw<ParticipantRow[]>`
      SELECT
        id, session_id AS "sessionId", tenant_id AS "tenantId",
        customer_id AS "customerId",
        participant_name AS "participantName",
        participant_email AS "participantEmail",
        status, payment_status AS "paymentStatus",
        joined_at AS "joinedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM booking.session_participants
      WHERE session_id = ${sessionId}::uuid
      ORDER BY joined_at ASC
    `
  }

  async create(tenantId: string, organisationId: string | undefined, dto: CreateSessionDto): Promise<SessionRow> {
    const rows = await this.prisma.write.$queryRaw<Omit<SessionRow, 'participantCount'>[]>`
      INSERT INTO booking.sessions (
        tenant_id, organisation_id, venue_id, resource_id, bookable_unit_id,
        name, description, starts_at, ends_at,
        price_per_participant, currency,
        min_participants, max_participants,
        status, coach_id, notes
      ) VALUES (
        ${tenantId}::uuid,
        ${organisationId ? organisationId : null}${organisationId ? Prisma.sql`::uuid` : Prisma.sql``},
        ${dto.venueId}::uuid,
        ${dto.resourceId}::uuid,
        ${dto.bookableUnitId}::uuid,
        ${dto.name},
        ${dto.description ?? null},
        ${dto.startsAt}::timestamptz,
        ${dto.endsAt}::timestamptz,
        ${dto.pricePerParticipant ?? null},
        ${dto.currency ?? 'GBP'},
        ${dto.minParticipants ?? null},
        ${dto.maxParticipants ?? null},
        'open',
        ${dto.coachId ?? null}${dto.coachId ? Prisma.sql`::uuid` : Prisma.sql``},
        ${dto.notes ?? null}
      )
      RETURNING
        id, tenant_id AS "tenantId", organisation_id AS "organisationId",
        venue_id AS "venueId", resource_id AS "resourceId",
        bookable_unit_id AS "bookableUnitId",
        name, description,
        starts_at AS "startsAt", ends_at AS "endsAt",
        price_per_participant::float AS "pricePerParticipant",
        currency, min_participants AS "minParticipants",
        max_participants AS "maxParticipants",
        status, coach_id AS "coachId", notes,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    const row = rows[0]
    if (!row) throw new Error('Insert failed to return row')
    return { ...row, participantCount: 0 }
  }

  async update(tenantId: string, id: string, dto: Partial<CreateSessionDto & { status: string }>): Promise<SessionRow | null> {
    const sets: Prisma.Sql[] = []
    if (dto.name !== undefined)        sets.push(Prisma.sql`name = ${dto.name}`)
    if (dto.description !== undefined) sets.push(Prisma.sql`description = ${dto.description ?? null}`)
    if (dto.startsAt !== undefined)    sets.push(Prisma.sql`starts_at = ${dto.startsAt}::timestamptz`)
    if (dto.endsAt !== undefined)      sets.push(Prisma.sql`ends_at = ${dto.endsAt}::timestamptz`)
    if (dto.pricePerParticipant !== undefined) sets.push(Prisma.sql`price_per_participant = ${dto.pricePerParticipant ?? null}`)
    if (dto.currency !== undefined)    sets.push(Prisma.sql`currency = ${dto.currency}`)
    if (dto.minParticipants !== undefined) sets.push(Prisma.sql`min_participants = ${dto.minParticipants ?? null}`)
    if (dto.maxParticipants !== undefined) sets.push(Prisma.sql`max_participants = ${dto.maxParticipants ?? null}`)
    if (dto.status !== undefined)      sets.push(Prisma.sql`status = ${dto.status}`)
    if (dto.notes !== undefined)       sets.push(Prisma.sql`notes = ${dto.notes ?? null}`)
    if (sets.length === 0) return this.findById(tenantId, id)

    const setSql = Prisma.join(sets, ', ')
    const rows = await this.prisma.write.$queryRaw<SessionRow[]>`
      UPDATE booking.sessions
      SET ${setSql}, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      RETURNING
        id, tenant_id AS "tenantId", organisation_id AS "organisationId",
        venue_id AS "venueId", resource_id AS "resourceId",
        bookable_unit_id AS "bookableUnitId",
        name, description,
        starts_at AS "startsAt", ends_at AS "endsAt",
        price_per_participant::float AS "pricePerParticipant",
        currency, min_participants AS "minParticipants",
        max_participants AS "maxParticipants",
        status, coach_id AS "coachId", notes,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    return rows[0] ? { ...rows[0], participantCount: 0 } : null
  }

  async addParticipant(tenantId: string, sessionId: string, dto: JoinSessionDto): Promise<ParticipantRow> {
    const rows = await this.prisma.write.$queryRaw<ParticipantRow[]>`
      INSERT INTO booking.session_participants (
        session_id, tenant_id, customer_id,
        participant_name, participant_email,
        status, payment_status
      ) VALUES (
        ${sessionId}::uuid,
        ${tenantId}::uuid,
        ${dto.customerId ?? null}${dto.customerId ? Prisma.sql`::uuid` : Prisma.sql``},
        ${dto.participantName},
        ${dto.participantEmail ?? null},
        'registered',
        'unpaid'
      )
      RETURNING
        id, session_id AS "sessionId", tenant_id AS "tenantId",
        customer_id AS "customerId",
        participant_name AS "participantName",
        participant_email AS "participantEmail",
        status, payment_status AS "paymentStatus",
        joined_at AS "joinedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    return rows[0]!
  }

  async updateParticipant(
    tenantId: string,
    sessionId: string,
    participantId: string,
    dto: { status?: string; paymentStatus?: string },
  ): Promise<ParticipantRow | null> {
    const sets: Prisma.Sql[] = []
    if (dto.status !== undefined)        sets.push(Prisma.sql`status = ${dto.status}`)
    if (dto.paymentStatus !== undefined) sets.push(Prisma.sql`payment_status = ${dto.paymentStatus}`)
    if (sets.length === 0) return null

    const setSql = Prisma.join(sets, ', ')
    const rows = await this.prisma.write.$queryRaw<ParticipantRow[]>`
      UPDATE booking.session_participants
      SET ${setSql}, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND session_id = ${sessionId}::uuid
        AND id = ${participantId}::uuid
      RETURNING
        id, session_id AS "sessionId", tenant_id AS "tenantId",
        customer_id AS "customerId",
        participant_name AS "participantName",
        participant_email AS "participantEmail",
        status, payment_status AS "paymentStatus",
        joined_at AS "joinedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    return rows[0] ?? null
  }

  /** Active participant count (excludes cancelled) */
  async activeCount(sessionId: string): Promise<number> {
    const rows = await this.prisma.read.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM booking.session_participants
      WHERE session_id = ${sessionId}::uuid AND status <> 'cancelled'
    `
    return Number(rows[0]?.count ?? 0)
  }

  /** Update status to 'full' or back to 'open' based on count */
  async syncCapacityStatus(tenantId: string, sessionId: string, maxParticipants: number | null): Promise<void> {
    if (maxParticipants == null) return
    const count = await this.activeCount(sessionId)
    const newStatus = count >= maxParticipants ? 'full' : 'open'
    await this.prisma.write.$executeRaw`
      UPDATE booking.sessions
      SET status = ${newStatus}, updated_at = NOW()
      WHERE id = ${sessionId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status NOT IN ('cancelled', 'completed')
    `
  }
}
