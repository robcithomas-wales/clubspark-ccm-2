import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

export interface TenantContext {
  tenantId: string
  organisationId?: string
}

export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { tenantContext: TenantContext }>()
    return request.tenantContext
  },
)
