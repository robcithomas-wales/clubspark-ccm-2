import { Module } from '@nestjs/common'
import { AvailabilityController } from './availability.controller.js'
import { AvailabilityService } from './availability.service.js'
import { AvailabilityRepository } from './availability.repository.js'

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository],
  exports: [AvailabilityRepository],
})
export class AvailabilityModule {}
