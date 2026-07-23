import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { InternalContext } from '../guards/internal.guard.js'
import type { StartImpersonationDto } from './dto/start-impersonation.dto.js'

@Injectable()
export class ImpersonationService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.impersonationSession.findMany({
      where: { status: 'active' },
      include: { organisation: { select: { name: true, slug: true } } },
      orderBy: { startedAt: 'desc' },
    })
  }

  async listAll(opts: { staffId?: string; tenantId?: string; limit?: number; offset?: number }) {
    const where = {
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
      ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.impersonationSession.findMany({
        where,
        include: { organisation: { select: { name: true } } },
        orderBy: { startedAt: 'desc' },
        take: opts.limit ?? 50,
        skip: opts.offset ?? 0,
      }),
      this.prisma.impersonationSession.count({ where }),
    ])
    return { data, total }
  }

  async start(tenantId: string, dto: StartImpersonationDto, ctx: InternalContext) {
    // One active session per staff + target at a time
    const existing = await this.prisma.impersonationSession.findFirst({
      where: { staffId: ctx.staffId, tenantId, targetUserId: dto.targetUserId, status: 'active' },
    })
    if (existing) throw new ConflictException('An active impersonation session already exists for this target')

    return this.prisma.impersonationSession.create({
      data: {
        staffId: ctx.staffId,
        staffEmail: ctx.staffEmail,
        tenantId,
        targetUserId: dto.targetUserId,
        targetEmail: dto.targetEmail,
        reason: dto.reason,
      },
    })
  }

  async end(sessionId: string, ctx: InternalContext) {
    const session = await this.prisma.impersonationSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`)
    if (session.status === 'ended') return session

    return this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { status: 'ended', endedAt: new Date() },
    })
  }
}
