import { Module } from '@nestjs/common'
import { ScoringController } from './scoring.controller.js'
import { ScoringService } from './scoring.service.js'
import { ScoringRepository } from './scoring.repository.js'

@Module({
  controllers: [ScoringController],
  providers: [ScoringService, ScoringRepository],
  exports: [ScoringService],
})
export class ScoringModule {}
