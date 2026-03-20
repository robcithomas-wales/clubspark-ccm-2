import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { FastifyRequest } from 'fastify'

export const SKIP_TENANT_KEY = 'skipTenant'

// Lazy-initialised so the JWKS URL is read at runtime, not module load
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) {
    const url = process.env['SUPABASE_URL']
    if (!url) throw new UnauthorizedException('SUPABASE_URL is not configured')
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`))
  }
  return jwks
}

interface SupabasePayload {
  sub: string
  app_metadata?: {
    tenantId?: string
    organisationId?: string
  }
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) return true

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { tenantContext?: unknown }>()

    const authHeader = request.headers['authorization'] as string | undefined

    // ── JWT path (portal / real traffic) ───────────────────────────────────
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)

      let payload: SupabasePayload
      try {
        const result = await jwtVerify(token, getJwks())
        payload = result.payload as unknown as SupabasePayload
      } catch {
        throw new UnauthorizedException('Invalid or expired token')
      }

      const tenantId = payload.app_metadata?.tenantId
      const organisationId = payload.app_metadata?.organisationId

      if (!tenantId) {
        throw new UnauthorizedException('Token is missing tenantId claim')
      }

      request.tenantContext = { tenantId, organisationId }
      return true
    }

    // ── Header fallback (integration tests) ────────────────────────────────
    const tenantId = request.headers['x-tenant-id'] as string | undefined
    const organisationId = request.headers['x-organisation-id'] as string | undefined

    if (!tenantId) {
      throw new UnauthorizedException('Authentication required')
    }

    request.tenantContext = { tenantId, organisationId }
    return true
  }
}
