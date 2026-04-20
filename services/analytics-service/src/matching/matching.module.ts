import { Module } from '@nestjs/common'
import { MatchingController } from './matching.controller.js'
import { MatchingService } from './matching.service.js'
import { MatchingRepository } from './matching.repository.js'

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, MatchingRepository],
  exports: [MatchingService],
})
export class MatchingModule {}
