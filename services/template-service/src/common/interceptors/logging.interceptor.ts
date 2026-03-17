import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  Logger,
} from '@nestjs/common'
import { type Observable, tap } from 'rxjs'
import type { FastifyRequest } from 'fastify'

/**
 * Logs each request with method, path, status, and duration.
 * Applied globally in AppModule.
 *
 * ASP.NET equivalent: a global ActionFilter or middleware logging pipeline.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const { method, url } = request
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start
        this.logger.log(`${method} ${url} — ${duration}ms`)
      }),
    )
  }
}
