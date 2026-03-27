import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { CompetitionsModule } from './competitions/competitions.module.js'
import { DivisionsModule } from './divisions/divisions.module.js'
import { EntriesModule } from './entries/entries.module.js'
import { DrawModule } from './draw/draw.module.js'
import { MatchesModule } from './matches/matches.module.js'
import { StandingsModule } from './standings/standings.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    HealthModule,
    CompetitionsModule,
    DivisionsModule,
    EntriesModule,
    DrawModule,
    MatchesModule,
    StandingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
