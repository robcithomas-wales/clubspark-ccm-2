import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import { AUTH_OPTIONS, SKIP_TENANT_KEY } from './constants.js'
import { TokenVerifier } from './token-verifier.js'
import type { AuthOptions, TenantContext } from './types.js'

type AuthedRequest = FastifyRequest & { tenantContext?: TenantContext }

/**
 * Establishes tenant context for every request, or rejects it.
 *
 * Registered as a global `APP_GUARD` by `AuthModule.forRoot()`, so it is
 * fail-closed by construction: a new controller is protected unless it opts out
 * with `@SkipTenant()`.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifier,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>()
    const path = (request.url ?? '').split('?')[0] ?? ''

    const bypassed = [
      ...(this.options.publicPathPrefixes ?? []),
      ...(this.options.internalPathPrefixes ?? []),
    ]
    if (bypassed.some((prefix) => path.startsWith(prefix))) return true

    const authHeader = request.headers['authorization']

    // ── JWT path: portals and real traffic ──────────────────────────────────
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const claims = await this.verifier.verify(authHeader.slice(7))

      if (!claims.tenantId) {
        throw new UnauthorizedException('Token is missing tenantId claim')
      }

      request.tenantContext = {
        ...(claims.userId ? { userId: claims.userId } : {}),
        tenantId: claims.tenantId,
        ...(claims.organisationId ? { organisationId: claims.organisationId } : {}),
      }
      return true
    }

    // ── Header fallback: integration tests and local development only ───────
    //
    // SECURITY: trusting `x-tenant-id` means trusting the caller to say which
    // tenant's data to return. Fail-closed — `resolveHeaderFallback` enables it
    // only when NODE_ENV is exactly 'test' or 'development', so production and
    // an unset NODE_ENV both refuse it.
    if (!this.options.allowHeaderFallback) {
      throw new UnauthorizedException('Authentication required')
    }

    const tenantId = request.headers['x-tenant-id']
    const organisationId = request.headers['x-organisation-id']
    const userId = request.headers['x-user-id']

    if (typeof tenantId !== 'string' || !tenantId) {
      throw new UnauthorizedException('Authentication required')
    }

    request.tenantContext = {
      ...(typeof userId === 'string' && userId ? { userId } : {}),
      tenantId,
      ...(typeof organisationId === 'string' && organisationId ? { organisationId } : {}),
    }
    return true
  }
}
