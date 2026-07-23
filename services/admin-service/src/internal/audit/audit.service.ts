import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import type { InternalContext } from '../guards/internal.guard.js'

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
        meta: (meta ?? {}) as never,
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
