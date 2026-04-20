import { Module } from '@nestjs/common'
import { AnomalyController } from './anomaly.controller.js'
import { AnomalyService } from './anomaly.service.js'
import { AnomalyRepository } from './anomaly.repository.js'

@Module({
  controllers: [AnomalyController],
  providers: [AnomalyService, AnomalyRepository],
  exports: [AnomalyService],
})
export class AnomalyModule {}
