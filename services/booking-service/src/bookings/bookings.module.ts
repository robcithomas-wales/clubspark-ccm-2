import { Module } from '@nestjs/common'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'
import { BookingsRepository } from './bookings.repository.js'
import { BookingExpiryTask } from './tasks/booking-expiry.task.js'
import { AvailabilityModule } from '../availability/availability.module.js'
import { BookingRulesModule } from '../booking-rules/booking-rules.module.js'

@Module({
  imports: [AvailabilityModule, BookingRulesModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository, BookingExpiryTask],
})
export class BookingsModule {}
