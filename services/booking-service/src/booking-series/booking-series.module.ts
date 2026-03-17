import { Module } from '@nestjs/common'
import { BookingSeriesController } from './booking-series.controller.js'
import { BookingSeriesService } from './booking-series.service.js'
import { BookingSeriesRepository } from './booking-series.repository.js'
import { BookingsRepository } from '../bookings/bookings.repository.js'
import { AvailabilityModule } from '../availability/availability.module.js'

@Module({
  imports: [AvailabilityModule],
  controllers: [BookingSeriesController],
  providers: [BookingSeriesService, BookingSeriesRepository, BookingsRepository],
})
export class BookingSeriesModule {}
