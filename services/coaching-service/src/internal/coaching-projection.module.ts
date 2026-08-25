import { Module } from '@nestjs/common'
import { CoachingProjectionController } from './coaching-projection.controller.js'
import { CoachingProjectionService } from './coaching-projection.service.js'

@Module({ controllers: [CoachingProjectionController], providers: [CoachingProjectionService] })
export class CoachingProjectionModule {}
