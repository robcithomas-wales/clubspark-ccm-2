import { Module } from '@nestjs/common'
import { ForecastingController } from './forecasting.controller.js'
import { ForecastingService } from './forecasting.service.js'
import { ForecastingRepository } from './forecasting.repository.js'
import { JobLeaseModule } from '../scheduled-jobs/job-lease.module.js'

@Module({
  imports: [JobLeaseModule],
  controllers: [ForecastingController],
  providers: [ForecastingService, ForecastingRepository],
  exports: [ForecastingService],
})
export class ForecastingModule {}
