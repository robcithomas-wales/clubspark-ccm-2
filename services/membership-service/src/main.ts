import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe, VersioningType, VERSION_NEUTRAL } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )

  // Without this, every class-validator decorator in this service's DTOs is inert
  // in production — only the test harness was installing a pipe. Matches the
  // configuration used by booking-service and people-service.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const configService = app.get(ConfigService)
  const port = configService.get<number>('port') ?? 4010
  const nodeEnv = process.env['NODE_ENV'] ?? 'development'

  // URI versioning. `defaultVersion` covers controllers that declare no version
  // of their own: VERSION_NEUTRAL keeps their existing unprefixed route working
  // (portals, mobile and inter-service clients call those today), and '1' also
  // exposes them under /v1 so every service is reachable at /v1 consistently.
  // Controllers that set `version` explicitly are unaffected.
  //
  // Must run BEFORE createDocument: the Swagger document is built from the routes
  // registered at that moment, so building it first would document only the
  // unprefixed paths while the router serves both.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '1'],
  })

  // Non-production only, and at api/docs, matching the other 14 services.
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Membership Service')
      .setDescription('Schemes, plans, memberships and entitlements')
      .setVersion('1.0')
      .build()
    // A neutral+v1 route pair would otherwise emit the same operationId twice,
    // which is invalid OpenAPI and breaks client generators.
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey, methodKey, version) =>
        version ? `${controllerKey}_${methodKey}_v${version}` : `${controllerKey}_${methodKey}`,
    })
    SwaggerModule.setup('api/docs', app, document)
  }

  app.enableCors()

  await app.listen(port, '0.0.0.0')
  console.log(`Membership service listening on port ${port}`)
}

void bootstrap()
