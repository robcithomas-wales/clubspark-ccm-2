import { Module } from '@nestjs/common'
import { ForecastingController } from './forecasting.controller.js'
import { ForecastingService } from './forecasting.service.js'
import { ForecastingRepository } from './forecasting.repository.js'

@Module({
  controllers: [ForecastingController],
  providers: [ForecastingService, ForecastingRepository],
  exports: [ForecastingService],
})
export class ForecastingModule {}
