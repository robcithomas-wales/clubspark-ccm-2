import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'

export const SKIP_TENANT_KEY = 'skipTenant'

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) return true

    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const tenantId = request.headers['x-tenant-id'] as string | undefined
    const organisationId = request.headers['x-organisation-id'] as string | undefined

    if (!tenantId) throw new UnauthorizedException('x-tenant-id header is required')
    if (!organisationId) throw new UnauthorizedException('x-organisation-id header is required')

    ;(request as FastifyRequest & { tenantContext: unknown }).tenantContext = { tenantId, organisationId }

    return true
  }
}
