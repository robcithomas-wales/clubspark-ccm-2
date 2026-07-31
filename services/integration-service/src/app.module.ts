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
import { ApiKeyUsageInterceptor } from './common/interceptors/api-key-usage.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { ApiKeysModule } from './api-keys/api-keys.module.js'
import { WebhookSubscriptionsModule } from './webhook-subscriptions/webhook-subscriptions.module.js'
import { WebhookDeliveriesModule } from './webhook-deliveries/webhook-deliveries.module.js'
import { EventsModule } from './events/events.module.js'
import { OAuthConnectionsModule } from './oauth-connections/oauth-connections.module.js'
import { AccountingSettingsModule } from './accounting-settings/accounting-settings.module.js'
import { AccountingSyncModule } from './accounting-sync/accounting-sync.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: join(__dirname, '..', '.env') }),
    // Scheduled jobs are not registered under test.
    //
    // Several suites assert on state that a @Cron owns — the webhook-delivery
    // worker flipping pending->failed, the outbox relay publishing a row a test
    // expects to still be unsent. A job firing mid-test made suites fail in CI
    // while passing locally. Tests that exercise a job call its method directly,
    // which still works with the scheduler off.
    ...(process.env['NODE_ENV'] === 'test' ? [] : [ScheduleModule.forRoot()]),
    PrismaModule,
    HealthModule,
    ApiKeysModule,
    WebhookSubscriptionsModule,
    WebhookDeliveriesModule,
    EventsModule,
    OAuthConnectionsModule,
    AccountingSettingsModule,
    AccountingSyncModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiKeyUsageInterceptor },
  ],
})
export class AppModule {}
