import { Module } from '@nestjs/common'
import { AvailabilityController } from './availability.controller.js'
import { AvailabilityService } from './availability.service.js'
import { AvailabilityRepository } from './availability.repository.js'
import { CoachesRepository } from '../coaches/coaches.repository.js'

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository, CoachesRepository],
})
export class AvailabilityModule {}
