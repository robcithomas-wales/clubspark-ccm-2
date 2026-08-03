import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { TenantContextGuard } from './common/guards/tenant-context.guard.js'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { BookingsModule } from './bookings/bookings.module.js'
import { AvailabilityModule } from './availability/availability.module.js'
import { BookingSeriesModule } from './booking-series/booking-series.module.js'
import { BookingRulesModule } from './booking-rules/booking-rules.module.js'
import { PricingModule } from './pricing/pricing.module.js'
import { SessionsModule } from './sessions/sessions.module.js'
import { EventBusModule } from './event-bus/event-bus.module.js'
import { RefundPoliciesModule } from './refund-policies/refund-policies.module.js'
import { OrderModule } from './order-client/order.module.js'

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
    OrderModule,
    BookingsModule,
    AvailabilityModule,
    BookingSeriesModule,
    BookingRulesModule,
    PricingModule,
    SessionsModule,
    RefundPoliciesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
