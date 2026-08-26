import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { InternalContext } from '../staff-attribution.interceptor.js'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    ctx: InternalContext,
    tenantId: string | null,
    action: string,
    targetType?: string,
    targetId?: string,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        staffId: ctx.staffId,
        staffEmail: ctx.staffEmail,
        tenantId: tenantId ?? undefined,
        action,
        targetType,
        targetId,
        // `staffId` is a claim from a forgeable header until staff identity comes
        // from a verified token; record which, so a reader of the trail can tell.
        meta: { ...(meta ?? {}), actorSource: ctx.actorSource } as never,
      },
    })
  }

  async findMany(opts: {
    staffId?: string
    tenantId?: string
    action?: string
    limit?: number
    offset?: number
  }) {
    const where = {
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
      ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
      ...(opts.action ? { action: { contains: opts.action } } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.limit ?? 100,
        skip: opts.offset ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { data, total }
  }
}
