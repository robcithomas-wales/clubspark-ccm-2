import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { throwError } from 'rxjs'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaService } from '../../prisma/prisma.service.js'

@Injectable()
export class ApiKeyUsageInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { apiKey?: { id: string } }
    >()
    const apiKey = request.apiKey
    if (!apiKey) return next.handle()

    const endpoint = request.url as string
    const timestamp = new Date()

    const log = (responseCode: number) => {
      this.prisma.write.apiKeyUsage
        .create({ data: { apiKeyId: apiKey.id, endpoint, responseCode, timestamp } })
        .catch(() => {})
    }

    return next.handle().pipe(
      tap(() => {
        const reply = context.switchToHttp().getResponse<FastifyReply>()
        log(reply.statusCode ?? 200)
      }),
      catchError((err: unknown) => {
        const code =
          typeof err === 'object' && err !== null && 'status' in err
            ? (err as { status: number }).status
            : 500
        log(code)
        return throwError(() => err)
      }),
    )
  }
}
