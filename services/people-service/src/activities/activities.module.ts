import { Module } from '@nestjs/common'
import { ActivitiesController } from './activities.controller.js'
import { ActivitiesService } from './activities.service.js'
import { ActivitiesRepository } from './activities.repository.js'
import { EventInboxService } from './event-inbox.service.js'

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivitiesRepository, EventInboxService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
