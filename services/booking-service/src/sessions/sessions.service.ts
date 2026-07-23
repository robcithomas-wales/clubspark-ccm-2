import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { SessionsRepository } from './sessions.repository.js'
import type { CreateSessionDto } from './dto/create-session.dto.js'
import type { JoinSessionDto } from './dto/join-session.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name)

  constructor(private readonly repo: SessionsRepository) {}

  async list(ctx: TenantContext, filters: { status?: string; upcoming?: boolean } = {}) {
    const sessions = await this.repo.findAll(ctx.tenantId, filters)
    return sessions.map((s) => this.withDerived(s))
  }

  async getById(ctx: TenantContext, id: string) {
    const session = await this.repo.findById(ctx.tenantId, id)
    if (!session) throw new NotFoundException('Session not found')
    const participants = await this.repo.findParticipants(id)
    return { ...this.withDerived(session), participants }
  }

  async create(ctx: TenantContext, dto: CreateSessionDto) {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt')
    }
    if (dto.minParticipants && dto.maxParticipants && dto.minParticipants > dto.maxParticipants) {
      throw new BadRequestException('minParticipants cannot exceed maxParticipants')
    }
    const session = await this.repo.create(ctx.tenantId, ctx.organisationId, dto)
    this.logger.log({ id: session.id, name: session.name }, 'Session created')
    return this.withDerived(session)
  }

  async update(ctx: TenantContext, id: string, dto: Partial<CreateSessionDto>) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Session not found')
    if (existing.status === 'cancelled') throw new ConflictException('Cannot edit a cancelled session')

    const session = await this.repo.update(ctx.tenantId, id, dto)
    return session ? this.withDerived(session) : null
  }

  async cancel(ctx: TenantContext, id: string) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Session not found')
    if (existing.status === 'cancelled') throw new ConflictException('Session is already cancelled')

    const session = await this.repo.update(ctx.tenantId, id, { status: 'cancelled' })
    this.logger.log({ id }, 'Session cancelled')
    return session ? this.withDerived(session) : null
  }

  async complete(ctx: TenantContext, id: string) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Session not found')
    if (existing.status === 'cancelled') throw new ConflictException('Session is cancelled')

    const session = await this.repo.update(ctx.tenantId, id, { status: 'completed' })
    return session ? this.withDerived(session) : null
  }

  async join(ctx: TenantContext, id: string, dto: JoinSessionDto) {
    const session = await this.repo.findById(ctx.tenantId, id)
    if (!session) throw new NotFoundException('Session not found')
    if (session.status === 'cancelled') throw new ConflictException('Session is cancelled')
    if (session.status === 'completed') throw new ConflictException('Session is already completed')
    if (session.status === 'full') throw new ConflictException('Session is full')

    // Re-check capacity with a fresh count
    const activeCount = await this.repo.activeCount(id)
    if (session.maxParticipants != null && activeCount >= session.maxParticipants) {
      // Sync status and reject
      await this.repo.update(ctx.tenantId, id, { status: 'full' })
      throw new ConflictException('Session has reached maximum capacity')
    }

    const participant = await this.repo.addParticipant(ctx.tenantId, id, dto)
    this.logger.log({ sessionId: id, participantName: dto.participantName }, 'Participant joined session')

    // Sync status after adding
    await this.repo.syncCapacityStatus(ctx.tenantId, id, session.maxParticipants)

    return participant
  }

  async updateParticipant(
    ctx: TenantContext,
    sessionId: string,
    participantId: string,
    dto: { status?: string; paymentStatus?: string },
  ) {
    const session = await this.repo.findById(ctx.tenantId, sessionId)
    if (!session) throw new NotFoundException('Session not found')

    const updated = await this.repo.updateParticipant(ctx.tenantId, sessionId, participantId, dto)
    if (!updated) throw new NotFoundException('Participant not found')

    // Sync capacity if a participant was cancelled
    if (dto.status === 'cancelled') {
      await this.repo.syncCapacityStatus(ctx.tenantId, sessionId, session.maxParticipants)
    }
    return updated
  }

  async getParticipants(ctx: TenantContext, sessionId: string) {
    const session = await this.repo.findById(ctx.tenantId, sessionId)
    if (!session) throw new NotFoundException('Session not found')
    return this.repo.findParticipants(sessionId)
  }

  /** Adds derived fields for display */
  private withDerived(session: any) {
    const count = Number(session.participantCount ?? 0)
    const isConfirmed = session.minParticipants == null || count >= session.minParticipants
    const spotsLeft = session.maxParticipants != null ? session.maxParticipants - count : null
    return { ...session, participantCount: count, isConfirmed, spotsLeft }
  }
}
