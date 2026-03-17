import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { FastifyRequest } from 'fastify'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const { method, url } = request
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} — ${Date.now() - start}ms`)
      }),
    )
  }
}
