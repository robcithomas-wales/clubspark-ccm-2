import { Module } from '@nestjs/common'
import { RankingsController } from './rankings.controller.js'
import { RankingsService } from './rankings.service.js'
import { RankingsRepository } from './rankings.repository.js'

@Module({
  controllers: [RankingsController],
  providers: [RankingsService, RankingsRepository],
  exports: [RankingsService],
})
export class RankingsModule {}
