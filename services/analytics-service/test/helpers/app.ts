import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { AppModule } from '../../src/app.module.js'

let app: NestFastifyApplication | null = null

export async function getApp(): Promise<NestFastifyApplication> {
  if (app) return app

  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  )

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.enableVersioning({ type: VersioningType.URI })
  await app.listen(0)
  return app
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
}
