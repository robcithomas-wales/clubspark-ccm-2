import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
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

  // listen(0) binds to a random available port — required for Fastify's
  // HTTP server to be initialised so supertest can send a real request
  await app.listen(0)

  return app
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
}
