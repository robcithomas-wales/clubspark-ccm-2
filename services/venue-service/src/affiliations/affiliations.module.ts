import { Module } from '@nestjs/common'
import { AffiliationsController } from './affiliations.controller.js'
import { AffiliationsService } from './affiliations.service.js'
import { AffiliationsRepository } from './affiliations.repository.js'

@Module({
  controllers: [AffiliationsController],
  providers: [AffiliationsService, AffiliationsRepository],
  exports: [AffiliationsService],
})
export class AffiliationsModule {}
