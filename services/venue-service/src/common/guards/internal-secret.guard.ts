import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { createHash, timingSafeEqual } from 'crypto'

/**
 * Guards service-to-service endpoints that no end user should ever call — e.g.
 * the customer-reassignment hook people-service uses when merging two person
 * records. Requires an `X-Internal-Secret` header matching the INTERNAL_SECRET
 * env var, the same convention used across the platform (see admin-service
 * InternalGuard, integration-service InternalSecretGuard).
 *
 * These routes are `@SkipTenant()`, because a service-to-service caller has no
 * end-user JWT to present. That makes this guard the **sole** authenticator, so
 * unlike the tenant guard's header fallback it must NOT open up in development:
 * `run-all.sh` exports NODE_ENV=development, so a dev-mode bypass here would
 * leave a bulk-mutation endpoint unauthenticated on every developer machine.
 *
 * Fail closed everywhere except NODE_ENV='test' (where the integration suites
 * run without a configured secret). Set INTERNAL_SECRET in each service's .env
 * for local development — see .env.example.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>()

    if (process.env['NODE_ENV'] === 'test') return true

    const secret = process.env['INTERNAL_SECRET']
    if (!secret) {
      throw new UnauthorizedException('Internal secret is not configured')
    }

    const provided = req.headers['x-internal-secret'] as string | undefined
    if (!provided || !timingSafeMatch(provided, secret)) {
      throw new UnauthorizedException('Invalid or missing X-Internal-Secret header')
    }

    return true
  }
}

/** Constant-time comparison, via fixed-length digests so lengths can't leak. */
function timingSafeMatch(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
