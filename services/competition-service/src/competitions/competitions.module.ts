import { Module } from '@nestjs/common'
import { CompetitionsController } from './competitions.controller.js'
import { CompetitionsService } from './competitions.service.js'
import { CompetitionsRepository } from './competitions.repository.js'

@Module({
  controllers: [CompetitionsController],
  providers: [CompetitionsService, CompetitionsRepository],
  exports: [CompetitionsService, CompetitionsRepository],
})
export class CompetitionsModule {}
