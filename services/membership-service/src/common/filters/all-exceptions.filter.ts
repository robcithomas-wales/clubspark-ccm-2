import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let code = 'INTERNAL_ERROR'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message ?? message
      code = (res as any).code ?? 'HTTP_ERROR'
    } else if (exception instanceof Error) {
      const err = exception as any
      if (err.statusCode) status = err.statusCode
      message = err.message ?? message
      code = err.code ?? code
    }

    if (status >= 500) {
      this.logger.error(exception)
    }

    response.status(status).send({ error: { code, message } })
  }
}
