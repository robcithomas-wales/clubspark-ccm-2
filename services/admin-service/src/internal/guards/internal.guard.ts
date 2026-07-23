import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

/**
 * Guards all /internal/* routes. Accepts either:
 *  1. X-Internal-Secret header matching INTERNAL_SECRET env var (dev/service-to-service)
 *  2. JWT with app_metadata.role === 'clubspark_internal' (future prod path)
 *
 * Every request that passes this guard has req.internalContext set.
 */

export interface InternalContext {
  staffId: string
  staffEmail?: string
}

@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { internalContext?: InternalContext; tenantContext?: unknown }>()

    const secret = process.env['INTERNAL_SECRET']
    const provided = req.headers['x-internal-secret'] as string | undefined

    if (secret && provided && provided === secret) {
      const staffId = (req.headers['x-staff-id'] as string | undefined) ?? 'internal'
      const staffEmail = req.headers['x-staff-email'] as string | undefined
      req.internalContext = { staffId, staffEmail }
      return true
    }

    // JWT path: tenantContext already populated by TenantContextGuard if token present,
    // but internal staff won't have tenantId — they will have role claim instead.
    // For now the secret-based path is the only supported mechanism.
    throw new UnauthorizedException('Internal access requires X-Internal-Secret header')
  }
}
