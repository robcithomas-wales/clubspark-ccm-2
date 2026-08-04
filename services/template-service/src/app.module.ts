import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { AuthModule, supabaseAuth } from '@clubspark/auth'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthController } from './health/health.controller.js'

// ─── Import your domain modules here ────────────────────────────────────────
// import { BookingsModule } from './bookings/bookings.module.js'

/**
 * Root application module.
 *
 * Global providers registered here apply to every route automatically:
 * - AuthModule          — verifies the JWT and sets tenant context on every
 *                         request, via a global guard it registers itself
 * - AllExceptionsFilter — normalises error responses
 * - LoggingInterceptor  — request/response logging
 *
 * ASP.NET equivalent: Program.cs / Startup.cs service registration
 * and middleware pipeline configuration.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '..', '.env'),
    }),
    // Authentication for every route. `supabaseAuth()` is the only line that
    // names an identity provider — switching to Azure Entra External ID means
    // replacing it with `entraAuth({...})` here and nowhere else.
    AuthModule.forRoot(supabaseAuth()),
    PrismaModule,
    // Add domain modules here:
    // BookingsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global exception filter — consistent error shape
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
