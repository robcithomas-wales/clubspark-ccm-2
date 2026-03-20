import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { FastifyRequest } from 'fastify'

export const SKIP_TENANT_KEY = 'skipTenant'

/** Paths that bypass tenant auth entirely (e.g. health checks). */
const PUBLIC_PREFIXES = ['/health']

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) {
    const url = process.env['SUPABASE_URL']
    if (!url) throw new UnauthorizedException('SUPABASE_URL is not configured')
    jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`))
  }
  return jwks
}

export interface TenantContext {
  userId: string
  tenantId: string
  organisationId?: string
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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { tenantContext?: TenantContext }>()

    // Skip auth for public paths (health, etc.)
    const path = (request.url ?? '').split('?')[0] ?? ''
    if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return true
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

      request.tenantContext = {
        userId: payload.sub,
        tenantId,
        organisationId,
      }
      return true
    }

    // ── Header fallback (integration tests) ────────────────────────────────
    const tenantId = request.headers['x-tenant-id'] as string | undefined
    const userId = request.headers['x-user-id'] as string | undefined
    const organisationId = request.headers['x-organisation-id'] as string | undefined

    if (!tenantId) {
      throw new UnauthorizedException('Authentication required')
    }

    request.tenantContext = {
      userId: userId ?? 'test-user',
      tenantId,
      organisationId,
    }
    return true
  }
}
