import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule, supabaseAuth } from '@clubspark/auth'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { EventBusModule } from './event-bus/event-bus.module.js'
import { OrdersModule } from './orders/orders.module.js'
import { ProductsModule } from './products/products.module.js'

@Module({
  imports: [
    // Authentication for every route: verifies the JWT, sets tenant context,
    // and registers the global guard. supabaseAuth() is the only line naming an
    // identity provider — the Azure move swaps it for entraAuth({...}) here.
    AuthModule.forRoot(supabaseAuth()),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '..', '.env'),
    }),
    PrismaModule,
    EventBusModule,
    HealthModule,
    OrdersModule,
    ProductsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
