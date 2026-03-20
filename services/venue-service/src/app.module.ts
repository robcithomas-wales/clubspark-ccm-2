import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { VenuesModule } from './venues/venues.module.js'
import { ResourcesModule } from './resources/resources.module.js'
import { BookableUnitsModule } from './bookable-units/bookable-units.module.js'
import { AddOnsModule } from './add-ons/add-ons.module.js'
import { ResourceGroupsModule } from './resource-groups/resource-groups.module.js'
import { AvailabilityConfigsModule } from './availability-configs/availability-configs.module.js'
import { BlackoutDatesModule } from './blackout-dates/blackout-dates.module.js'
import { OrganisationsModule } from './organisations/organisations.module.js'
import { NewsPostsModule } from './news-posts/news-posts.module.js'
import { AffiliationsModule } from './affiliations/affiliations.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    HealthModule,
    VenuesModule,
    ResourcesModule,
    ResourceGroupsModule,
    BookableUnitsModule,
    AddOnsModule,
    AvailabilityConfigsModule,
    BlackoutDatesModule,
    OrganisationsModule,
    NewsPostsModule,
    AffiliationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
