import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { Observable } from 'rxjs'

/**
 * Who is acting on the internal plane — for the audit trail, NOT for access.
 *
 * `actorSource` is the honest part. `x-staff-id` / `x-staff-email` are headers set
 * by the internal portal and are forgeable by anything holding `INTERNAL_SECRET`
 * (which is every service), so a staff id recorded from them is a claim, not a
 * verified identity. Recording that distinction stops the audit trail implying
 * proof it does not have.
 *
 * When staff sign in through Entra, the portal will forward the staff token, this
 * will read verified claims instead, and `actorSource` becomes 'entra-token'.
 */
export interface InternalContext {
  staffId: string
  staffEmail?: string
  actorSource: 'header-claim' | 'entra-token'
}

/** Header-derived attribution. Access is decided by InternalSecretGuard, not here. */
@Injectable()
export class StaffAttributionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { internalContext?: InternalContext }>()

    req.internalContext = {
      staffId: (req.headers['x-staff-id'] as string | undefined) ?? 'internal',
      staffEmail: req.headers['x-staff-email'] as string | undefined,
      actorSource: 'header-claim',
    }

    return next.handle()
  }
}
