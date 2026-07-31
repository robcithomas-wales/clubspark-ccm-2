import { Module } from '@nestjs/common'
import { BookingSeriesController } from './booking-series.controller.js'
import { BookingSeriesService } from './booking-series.service.js'
import { BookingSeriesRepository } from './booking-series.repository.js'
import { BookingsRepository } from '../bookings/bookings.repository.js'
import { AvailabilityModule } from '../availability/availability.module.js'
import { PeopleModule } from '../people/people.module.js'

@Module({
  imports: [PeopleModule, AvailabilityModule],
  controllers: [BookingSeriesController],
  providers: [BookingSeriesService, BookingSeriesRepository, BookingsRepository],
})
export class BookingSeriesModule {}
