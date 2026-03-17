import { Module } from '@nestjs/common'
import { AvailabilityConfigsController } from './availability-configs.controller'
import { AvailabilityConfigsService } from './availability-configs.service'
import { AvailabilityConfigsRepository } from './availability-configs.repository'

@Module({
  controllers: [AvailabilityConfigsController],
  providers: [AvailabilityConfigsService, AvailabilityConfigsRepository],
  exports: [AvailabilityConfigsService],
})
export class AvailabilityConfigsModule {}
