import { Module } from '@nestjs/common'
import { VenueReferenceController } from './venue-reference.controller.js'
import { VenueReferenceService } from './venue-reference.service.js'

@Module({
  controllers: [VenueReferenceController],
  providers: [VenueReferenceService],
})
export class VenueReferenceModule {}
