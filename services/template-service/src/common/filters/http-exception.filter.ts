import {
  ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'

/**
 * Global exception filter — normalises all errors to a consistent response shape.
 *
 * Response shape:
 * { error: string, message: string, statusCode: number }
 *
 * ASP.NET equivalent: a global ExceptionFilterAttribute or UseExceptionHandler middleware.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let error = 'INTERNAL_SERVER_ERROR'
    let message = 'An unexpected error occurred'

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>
        error = (r['error'] as string) ?? exception.name
        message = (r['message'] as string) ?? exception.message
      } else {
        message = String(response)
        error = exception.name
      }
    } else if (exception instanceof Error) {
      const err = exception as Error & { statusCode?: number; code?: string }
      statusCode = err.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR
      error = err.code ?? 'INTERNAL_SERVER_ERROR'
      message = err.message

      if (statusCode >= 500) {
        this.logger.error(err.message, err.stack)
      }
    }

    void reply.status(statusCode).send({ error, message, statusCode })
  }
}
