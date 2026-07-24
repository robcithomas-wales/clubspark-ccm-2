import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { CustomersModule } from './customers/customers.module.js'
import { LifecycleModule } from './lifecycle/lifecycle.module.js'
import { TagsModule } from './tags/tags.module.js'
import { RolesModule } from './roles/roles.module.js'
import { HouseholdsModule } from './households/households.module.js'
import { ActivitiesModule } from './activities/activities.module.js'
import { SegmentsModule } from './segments/segments.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: join(__dirname, '..', '.env') }),
    PrismaModule,
    HealthModule,
    CustomersModule,
    LifecycleModule,
    TagsModule,
    RolesModule,
    HouseholdsModule,
    ActivitiesModule,
    SegmentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
