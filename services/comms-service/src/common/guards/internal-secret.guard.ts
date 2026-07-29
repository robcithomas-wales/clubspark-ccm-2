import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

/**
 * Guards service-to-service endpoints that are not tenant-authenticated (e.g. the
 * inbound event bus receiver). Requires an `X-Internal-Secret` header matching the
 * INTERNAL_SECRET env var — the same convention used across the platform
 * (see integration-service InternalSecretGuard, admin-service InternalGuard).
 *
 * Fail closed: if INTERNAL_SECRET is not configured, every request is rejected in
 * production; in test/development the check is skipped so local inter-service event
 * delivery isn't silently rejected (matching the tenant-guard pattern).
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>()

    const secret = process.env['INTERNAL_SECRET']
    if (!secret) {
      if (process.env['NODE_ENV'] !== 'test' && process.env['NODE_ENV'] !== 'development') {
        throw new UnauthorizedException('Internal secret is not configured')
      }
      return true
    }

    const provided = req.headers['x-internal-secret'] as string | undefined
    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid or missing X-Internal-Secret header')
    }

    return true
  }
}
