import { Module } from '@nestjs/common'
import { VenueModule } from '../venue/venue.module.js'
import { ProjectionsController } from './projections.controller.js'
import { ProjectionsRepository } from './projections.repository.js'
import { ProjectionsService } from './projections.service.js'
import { VenueProjectionReadsService } from './venue-projection-reads.service.js'
import { CoachingModule } from '../coaching/coaching.module.js'
import { CoachingProjectionReadsService } from './coaching-projection-reads.service.js'

@Module({
  imports: [VenueModule, CoachingModule],
  controllers: [ProjectionsController],
  providers: [
    ProjectionsRepository,
    ProjectionsService,
    VenueProjectionReadsService,
    CoachingProjectionReadsService,
  ],
  exports: [
    ProjectionsRepository,
    ProjectionsService,
    VenueProjectionReadsService,
    CoachingProjectionReadsService,
  ],
})
export class ProjectionsModule {}
