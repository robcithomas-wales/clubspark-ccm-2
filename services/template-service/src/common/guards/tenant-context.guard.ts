import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  BadRequestException,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { TenantContext } from '../decorators/tenant-context.decorator.js'

/**
 * Extracts x-tenant-id and x-organisation-id from request headers
 * and attaches them to request.tenantContext.
 *
 * Applied globally in AppModule — every route is tenant-scoped.
 *
 * ASP.NET equivalent: a base controller with [Authorize] + reading
 * tenant claims from the JWT / request context.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { tenantContext: TenantContext }
    >()

    const tenantId = request.headers['x-tenant-id']
    const organisationId = request.headers['x-organisation-id']

    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException({
        error: 'TENANT_CONTEXT_MISSING',
        message: 'Missing required header: x-tenant-id',
      })
    }

    if (!organisationId || typeof organisationId !== 'string') {
      throw new BadRequestException({
        error: 'ORGANISATION_CONTEXT_MISSING',
        message: 'Missing required header: x-organisation-id',
      })
    }

    request.tenantContext = { tenantId, organisationId }
    return true
  }
}
