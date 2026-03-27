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

    const fastifyStatusCode = (exception as any)?.statusCode as number | undefined

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (fastifyStatusCode && fastifyStatusCode < 500 ? fastifyStatusCode : HttpStatus.INTERNAL_SERVER_ERROR)

    const message =
      exception instanceof HttpException
        ? exception.message
        : (exception instanceof Error ? exception.message : 'Internal server error')

    if (status >= 500) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    void reply.status(status).send({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
    })
  }
}
