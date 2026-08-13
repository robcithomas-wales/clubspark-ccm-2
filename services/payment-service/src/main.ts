import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger, VersioningType, VERSION_NEUTRAL } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import type { AppConfig } from './config/configuration.js'

// TODO: raw body capture for webhook signature verification (Stripe, GoCardless)
// Requires a Fastify preHandler hook approach — the addContentTypeParser route
// conflicts with Fastify's built-in parser registration order in NestJS.

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env['NODE_ENV'] !== 'production',
    }),
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

  // URI versioning. `defaultVersion` covers controllers that declare no version
  // of their own: VERSION_NEUTRAL keeps their existing unprefixed route working
  // (portals, mobile and inter-service clients call those today), and '1' also
  // exposes them under /v1 so every service is reachable at /v1 consistently.
  // Controllers that set `version` explicitly are unaffected.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '1'],
  })

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ClubSpark — Payment Service')
      .setDescription('Gateway-agnostic payment processing, refunds, and webhook handling')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
      .addApiKey({ type: 'apiKey', name: 'x-organisation-id', in: 'header' }, 'organisation-id')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      // A neutral+v1 route pair would otherwise emit the same operationId twice,
      // which is invalid OpenAPI and makes client generators collapse or fail.
      operationIdFactory: (controllerKey, methodKey, version) =>
        version ? `${controllerKey}_${methodKey}_v${version}` : `${controllerKey}_${methodKey}`,
    })
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
