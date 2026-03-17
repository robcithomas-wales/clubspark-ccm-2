import { Module } from '@nestjs/common'
import { BlackoutDatesController } from './blackout-dates.controller.js'
import { BlackoutDatesService } from './blackout-dates.service.js'
import { BlackoutDatesRepository } from './blackout-dates.repository.js'

@Module({
  controllers: [BlackoutDatesController],
  providers: [BlackoutDatesService, BlackoutDatesRepository],
  exports: [BlackoutDatesService],
})
export class BlackoutDatesModule {}
