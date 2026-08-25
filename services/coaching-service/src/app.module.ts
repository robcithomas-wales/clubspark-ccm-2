import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { configuration } from './config/configuration.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule, supabaseAuth } from '@clubspark/auth'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js'
import { HealthModule } from './health/health.module.js'
import { CoachesModule } from './coaches/coaches.module.js'
import { LessonTypesModule } from './lesson-types/lesson-types.module.js'
import { AvailabilityModule } from './availability/availability.module.js'
import { SessionsModule } from './sessions/sessions.module.js'
import { OrderModule } from './order-client/order.module.js'
import { ProgrammesModule } from './programmes/programmes.module.js'
import { EnrolmentsModule } from './enrolments/enrolments.module.js'
import { AttendanceModule } from './attendance/attendance.module.js'
import { ScheduleModule } from '@nestjs/schedule'
import { OutboxModule } from './outbox/outbox.module.js'
import { CoachingProjectionModule } from './internal/coaching-projection.module.js'

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
    ...(process.env['NODE_ENV'] === 'test' ? [] : [ScheduleModule.forRoot()]),
    PrismaModule,
    OutboxModule,
    CoachingProjectionModule,
    OrderModule,
    HealthModule,
    CoachesModule,
    LessonTypesModule,
    AvailabilityModule,
    SessionsModule,
    ProgrammesModule,
    EnrolmentsModule,
    AttendanceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
