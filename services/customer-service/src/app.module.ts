import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    HealthModule,
    CustomersModule,
    LifecycleModule,
    TagsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
