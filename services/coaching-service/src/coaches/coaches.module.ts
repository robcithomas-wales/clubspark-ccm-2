import { Module } from '@nestjs/common'
import { CoachesController } from './coaches.controller.js'
import { CoachesService } from './coaches.service.js'
import { CoachesRepository } from './coaches.repository.js'

@Module({
  controllers: [CoachesController],
  providers: [CoachesService, CoachesRepository],
  exports: [CoachesService],
})
export class CoachesModule {}
