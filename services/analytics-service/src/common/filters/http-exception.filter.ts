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

    if (status >= 500) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : process.env['NODE_ENV'] !== 'production' && exception instanceof Error
          ? exception.message
          : 'Internal server error'

    const responseBody =
      typeof body === 'string'
        ? { statusCode: status, error: HttpStatus[status] ?? 'Error', message: body }
        : { statusCode: status, error: HttpStatus[status] ?? 'Error', ...(body as object) }

    void reply.status(status).send(responseBody)
  }
}
