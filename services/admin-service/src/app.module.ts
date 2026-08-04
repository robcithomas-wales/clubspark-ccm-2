import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule, supabaseAuth } from '@clubspark/auth'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { AdminUsersModule } from './admin-users/admin-users.module.js'
import { OrganisationsModule } from './internal/organisations/organisations.module.js'
import { FeatureFlagsModule } from './internal/feature-flags/feature-flags.module.js'
import { AuditModule } from './internal/audit/audit.module.js'
import { ImpersonationModule } from './internal/impersonation/impersonation.module.js'
import { StatsModule } from './internal/stats/stats.module.js'

@Module({
  imports: [
    // Authentication for every route: verifies the JWT, sets tenant context,
    // and registers the global guard. supabaseAuth() is the only line naming an
    // identity provider — the Azure move swaps it for entraAuth({...}) here.
    AuthModule.forRoot(
      supabaseAuth({
        // Internal staff routes carry no end-user JWT — they are authenticated by
        // @UseGuards(InternalGuard) on each controller instead. Anything added
        // under these prefixes MUST carry that guard; AuthModule logs a warning at
        // startup naming them, so the exposure is visible rather than silent.
        internalPathPrefixes: ['/v1/internal/', '/internal/'],
      }),
    ),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '..', '.env'),
    }),
    PrismaModule,
    HealthModule,
    AdminUsersModule,
    OrganisationsModule,
    FeatureFlagsModule,
    AuditModule,
    ImpersonationModule,
    StatsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
