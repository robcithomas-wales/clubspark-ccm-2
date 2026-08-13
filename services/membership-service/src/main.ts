import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { ConfigService } from '@nestjs/config'
import { configureRouting } from './bootstrap.js'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
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

  // Routing (URI versioning) is shared with test/helpers/app.ts so the two
  // cannot drift. See src/bootstrap.ts.
  configureRouting(app)

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
  logger.log(`Membership service listening on port ${port} [${nodeEnv}]`)
}

void bootstrap()
