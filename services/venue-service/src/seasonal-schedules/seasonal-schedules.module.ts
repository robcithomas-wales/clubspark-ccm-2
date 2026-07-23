import { Module } from '@nestjs/common'
import { SeasonalSchedulesController } from './seasonal-schedules.controller.js'
import { SeasonalSchedulesService } from './seasonal-schedules.service.js'
import { SeasonalSchedulesRepository } from './seasonal-schedules.repository.js'

@Module({
  controllers: [SeasonalSchedulesController],
  providers: [SeasonalSchedulesService, SeasonalSchedulesRepository],
  exports: [SeasonalSchedulesService],
})
export class SeasonalSchedulesModule {}
