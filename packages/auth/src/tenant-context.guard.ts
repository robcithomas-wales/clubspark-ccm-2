import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
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
export class TenantContextGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(TenantContextGuard.name)
  private resolvedRegion: string | null = null

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifier,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  /**
   * Resolve the region at startup, so a service that cannot determine which
   * region it serves refuses to start.
   *
   * This runs late enough to see `.env` — `ConfigModule.forRoot()` has already
   * executed by the time Nest calls lifecycle hooks — but early enough that the
   * process never accepts traffic. Deferring to the first request is not good
   * enough: the service would boot, report healthy on /health, and be given live
   * traffic by a load balancer before anyone discovered it could not tell which
   * tenants it is allowed to serve.
   */
  onModuleInit(): void {
    this.logger.log(`Serving region '${this.region()}'`)
  }

  /** Resolved once — see `RegionSource`. */
  private region(): string {
    if (this.resolvedRegion === null) {
      this.resolvedRegion =
        typeof this.options.region === 'function' ? this.options.region() : this.options.region
    }
    return this.resolvedRegion
  }

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

      // Data residency is a legal boundary, so a request that has reached the
      // wrong region is refused rather than served. 403, not 401: the caller is
      // authenticated, they are just not authorised *here* — and retrying with a
      // fresh token would not help, which a 401 would wrongly imply.
      //
      // Normally a no-op: Supabase does not emit a home-region claim, so
      // `homeRegion` is absent and there is nothing to disagree with. It becomes
      // live the moment the IdP is configured to include it.
      const region = this.region()
      if (claims.homeRegion && claims.homeRegion !== region) {
        throw new ForbiddenException(
          `Tenant's home region is '${claims.homeRegion}' but this is '${region}' — ` +
            'the request has reached the wrong region and cannot be served here',
        )
      }

      request.tenantContext = {
        ...(claims.userId ? { userId: claims.userId } : {}),
        tenantId: claims.tenantId,
        ...(claims.organisationId ? { organisationId: claims.organisationId } : {}),
        region,
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
      region: this.region(),
    }
    return true
  }
}
