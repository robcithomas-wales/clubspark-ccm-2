import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { createHash, timingSafeEqual } from 'crypto'
import type { FastifyRequest } from 'fastify'

/**
 * Guards service-to-service endpoints that no end user should ever call — e.g.
 * the customer-reassignment hook people-service uses when merging two person
 * records. Requires an `X-Internal-Secret` header matching the INTERNAL_SECRET
 * env var.
 *
 * These routes are `@SkipTenant()`, because a service-to-service caller has no
 * end-user JWT to present. That makes this guard the **sole** authenticator, so
 * unlike the tenant guard's header fallback it must NOT open up in development:
 * `run-all.sh` exports NODE_ENV=development, so a dev-mode bypass here would
 * leave bulk-mutation endpoints unauthenticated on every developer machine.
 *
 * **Fails closed unconditionally — there is no environment-based bypass.**
 *
 * This guard used to return true outright when NODE_ENV==='test', so the suites
 * could run without a configured secret. That made an ambient environment
 * variable sufficient to remove the only authenticator from endpoints that take
 * the tenant from a caller-supplied header — i.e. unauthenticated cross-tenant
 * writes. `process.env` is read per request, `@nestjs/config` copies `.env` keys
 * into it, and NODE_ENV is a value engineers set casually, so the blast radius
 * was one stray line in one file.
 *
 * Tests now do what a real caller does: set INTERNAL_SECRET and send the header.
 * That is one line of setup and it means the suites actually cover this guard
 * rather than skipping it.
 *
 * ⚠️ The value must be IDENTICAL across all services. A mismatch does not fail
 * loudly; it makes every cross-service call and domain event 401 quietly.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env['INTERNAL_SECRET']
    if (!secret) {
      throw new UnauthorizedException('Internal secret is not configured')
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>()
    const provided = req.headers['x-internal-secret']

    if (typeof provided !== 'string' || !timingSafeMatch(provided, secret)) {
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
