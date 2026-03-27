import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { AppModule } from './app.module.js'
import type { AppConfig } from './config/configuration.js'

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env['NODE_ENV'] !== 'production',
    }),
  )

  // Preserve raw body buffer on all requests so webhook handlers can verify
  // gateway signatures (Stripe, GoCardless etc. require the raw payload).
  app.getHttpAdapter().getInstance().addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (
      _req: FastifyRequest,
      body: Buffer,
      done: (err: Error | null, payload?: unknown) => void,
    ) => {
      ;(_req as FastifyRequest & { rawBody: Buffer }).rawBody = body
      try {
        done(null, JSON.parse(body.toString()))
      } catch (e) {
        done(e as Error)
      }
    },
  )

  const config = app.get(ConfigService<AppConfig, true>)
  const port = config.get('port', { infer: true })
  const nodeEnv = config.get('nodeEnv', { infer: true })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.enableVersioning({ type: VersioningType.URI })

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ClubSpark — Payment Service')
      .setDescription('Gateway-agnostic payment processing, refunds, and webhook handling')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
      .addApiKey({ type: 'apiKey', name: 'x-organisation-id', in: 'header' }, 'organisation-id')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`)
  }

  app.enableCors()

  await app.listen(port, '0.0.0.0')
  logger.log(`Payment service running on http://localhost:${port} [${nodeEnv}]`)
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error', err)
  process.exit(1)
})
