import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { HealthModule } from './health/health.module.js'
import { TeamsModule } from './teams/teams.module.js'
import { RosterModule } from './roster/roster.module.js'
import { FixturesModule } from './fixtures/fixtures.module.js'
import { AvailabilityModule } from './availability/availability.module.js'
import { SelectionModule } from './selection/selection.module.js'
import { ChargesModule } from './charges/charges.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    HealthModule,
    TeamsModule,
    RosterModule,
    FixturesModule,
    AvailabilityModule,
    SelectionModule,
    ChargesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
