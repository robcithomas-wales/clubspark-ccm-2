import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import compression from '@fastify/compress'
import helmet from '@fastify/helmet'
import { AppModule } from './app.module.js'
import type { AppConfig } from './config/configuration.js'

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')

  // ─── Create app with Fastify adapter ──────────────────────────────────────
  // IMPORTANT: always use FastifyAdapter — 3x throughput vs Express default
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env['NODE_ENV'] !== 'production',
    }),
  )

  const config = app.get(ConfigService<AppConfig, true>)
  const port = config.get('port', { infer: true })
  const nodeEnv = config.get('nodeEnv', { infer: true })

  // ─── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // API service — no CSP needed
  })

  // ─── Response compression ──────────────────────────────────────────────────
  await app.register(compression, { encodings: ['gzip', 'br'] })

  // ─── Global validation pipe ────────────────────────────────────────────────
  // Validates all incoming DTOs using class-validator decorators
  // ASP.NET equivalent: automatic model validation via data annotations
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip unknown properties
      forbidNonWhitelisted: false,
      transform: true,            // auto-transform to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // ─── API versioning ────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI })

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  // Auto-generated from decorators — available at /api/docs in non-production
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ClubSpark — Template Service')
      .setDescription('Replace with service-specific description')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
      .addApiKey({ type: 'apiKey', name: 'x-organisation-id', in: 'header' }, 'organisation-id')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`)
  }

  // ─── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port, '0.0.0.0')
  logger.log(`Service running on http://localhost:${port} [${nodeEnv}]`)
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error', err)
  process.exit(1)
})
