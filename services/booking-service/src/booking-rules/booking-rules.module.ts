import { Module } from '@nestjs/common'
import { BookingRulesController } from './booking-rules.controller.js'
import { BookingRulesService } from './booking-rules.service.js'
import { BookingRulesRepository } from './booking-rules.repository.js'

@Module({
  controllers: [BookingRulesController],
  providers: [BookingRulesService, BookingRulesRepository],
  exports: [BookingRulesRepository, BookingRulesService],
})
export class BookingRulesModule {}
