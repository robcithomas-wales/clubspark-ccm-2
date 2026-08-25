import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import type { AppConfig } from './config/configuration.js'
import { configureRouting } from './bootstrap.js'

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

  // Routing (URI versioning) is shared with test/helpers/app.ts so the two
  // cannot drift. See src/bootstrap.ts.
  configureRouting(app)

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ClubSpark — Coaching Service')
      .setDescription('Coaches, lesson types, and availability')
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
  logger.log(`Coaching service running on http://localhost:${port} [${nodeEnv}]`)
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal startup error', err)
  process.exit(1)
})
