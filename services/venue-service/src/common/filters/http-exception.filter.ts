import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    let message: unknown
    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      message = typeof response === 'object' && response !== null ? response : exception.message
    } else {
      message = 'Internal server error'
    }

    if (status >= 500) {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception))
    }

    void reply.status(status).send(
      typeof message === 'object'
        ? { statusCode: status, ...( message as object) }
        : { statusCode: status, error: HttpStatus[status] ?? 'Error', message },
    )
  }
}
