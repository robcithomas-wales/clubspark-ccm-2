import { Module } from '@nestjs/common'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'
import { BookingsRepository } from './bookings.repository.js'
import { BookingExpiryTask } from './tasks/booking-expiry.task.js'
import { BookingReminderTask } from './tasks/booking-reminder.task.js'
import { AvailabilityModule } from '../availability/availability.module.js'
import { BookingRulesModule } from '../booking-rules/booking-rules.module.js'
import { MembershipModule } from '../membership/membership.module.js'
import { PricingModule } from '../pricing/pricing.module.js'
import { EventBusModule } from '../event-bus/event-bus.module.js'
import { RefundPoliciesRepository } from '../refund-policies/refund-policies.repository.js'
import { PeopleModule } from '../people/people.module.js'
import { OutboxModule } from '../outbox/outbox.module.js'
import { VenueModule } from '../venue/venue.module.js'
import { ProjectionsModule } from '../projections/projections.module.js'

@Module({
  imports: [
    VenueModule,
    ProjectionsModule,
    OutboxModule,
    PeopleModule,
    AvailabilityModule,
    BookingRulesModule,
    MembershipModule,
    PricingModule,
    EventBusModule,
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingsRepository,
    BookingExpiryTask,
    BookingReminderTask,
    RefundPoliciesRepository,
  ],
})
export class BookingsModule {}
