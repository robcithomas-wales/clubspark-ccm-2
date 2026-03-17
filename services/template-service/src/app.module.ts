import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthController } from './health/health.controller.js'

// ─── Import your domain modules here ────────────────────────────────────────
// import { BookingsModule } from './bookings/bookings.module.js'

/**
 * Root application module.
 *
 * Global providers registered here apply to every route automatically:
 * - TenantContextGuard  — extracts x-tenant-id / x-organisation-id headers
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
      envFilePath: '.env',
    }),
    PrismaModule,
    // Add domain modules here:
    // BookingsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guard — tenant context on every request
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
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
