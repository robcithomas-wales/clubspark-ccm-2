import { Module } from '@nestjs/common'
import { BookingsController } from './bookings.controller.js'
import { BookingsService } from './bookings.service.js'
import { BookingsRepository } from './bookings.repository.js'
import { AvailabilityModule } from '../availability/availability.module.js'

@Module({
  imports: [AvailabilityModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
})
export class BookingsModule {}
