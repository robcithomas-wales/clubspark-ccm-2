import { Module, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule, supabaseAuth } from '@clubspark/auth'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { EventsModule } from './events/events.module.js'
import { TemplatesModule } from './templates/templates.module.js'
import { MessageLogModule } from './message-log/message-log.module.js'
import { SuppressionModule } from './suppression/suppression.module.js'
import { CampaignsModule } from './campaigns/campaigns.module.js'
import { AudiencesModule } from './audiences/audiences.module.js'
import { TemplatesService } from './templates/templates.service.js'

@Module({
  imports: [
    // Authentication for every route: verifies the JWT, sets tenant context,
    // and registers the global guard. supabaseAuth() is the only line naming an
    // identity provider — the Azure move swaps it for entraAuth({...}) here.
    AuthModule.forRoot(supabaseAuth()),
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
    HealthModule,
    EventsModule,
    TemplatesModule,
    MessageLogModule,
    SuppressionModule,
    CampaignsModule,
    AudiencesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name)

  constructor(private readonly templates: TemplatesService) {}

  async onModuleInit(): Promise<void> {
    await this.templates.seedSystemTemplates()
    this.logger.log('System templates seeded')
  }
}
