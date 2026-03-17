import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

export interface TenantContext {
  tenantId: string
  organisationId: string
}

/**
 * Extracts the tenant context from the request.
 * Populated by TenantContextGuard on every incoming request.
 *
 * Usage: @TenantCtx() ctx: TenantContext
 *
 * ASP.NET equivalent: reading from HttpContext.Items or a scoped service
 */
export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<{ tenantContext: TenantContext }>()
    return request.tenantContext
  },
)
