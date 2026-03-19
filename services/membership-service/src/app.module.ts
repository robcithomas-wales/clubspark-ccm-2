import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import configuration from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { MembershipSchemesModule } from './membership-schemes/membership-schemes.module'
import { MembershipPlansModule } from './membership-plans/membership-plans.module'
import { MembershipsModule } from './memberships/memberships.module'
import { EntitlementPoliciesModule } from './entitlement-policies/entitlement-policies.module'
import { TenantContextGuard } from './common/guards/tenant-context.guard'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    MembershipSchemesModule,
    MembershipPlansModule,
    MembershipsModule,
    EntitlementPoliciesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
