import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../../src/app.module.js'
import { configureRouting } from '../../src/bootstrap.js'

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

  // Same routing config as src/main.ts — see src/bootstrap.ts.
  configureRouting(app)

  await app.listen(0)
  return app
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
}
