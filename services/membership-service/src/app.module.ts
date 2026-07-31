import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import configuration from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { HealthModule } from './health/health.module'
import { MembershipSchemesModule } from './membership-schemes/membership-schemes.module'
import { MembershipPlansModule } from './membership-plans/membership-plans.module'
import { MembershipsModule } from './memberships/memberships.module'
import { EntitlementPoliciesModule } from './entitlement-policies/entitlement-policies.module'
import { EventBusModule } from './event-bus/event-bus.module'
import { TenantContextGuard } from './common/guards/tenant-context.guard'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '..', '.env'),
    }),
    // Scheduled jobs are not registered under test.
    //
    // Several suites assert on state that a @Cron owns — the webhook-delivery
    // worker flipping pending->failed, the outbox relay publishing a row a test
    // expects to still be unsent. A job firing mid-test made suites fail in CI
    // while passing locally. Tests that exercise a job call its method directly,
    // which still works with the scheduler off.
    ...(process.env['NODE_ENV'] === 'test' ? [] : [ScheduleModule.forRoot()]),
    PrismaModule,
    EventBusModule,
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
