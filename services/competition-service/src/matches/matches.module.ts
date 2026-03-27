import { Module } from '@nestjs/common'
import { MatchesController } from './matches.controller.js'
import { MatchesService } from './matches.service.js'
import { MatchesRepository } from './matches.repository.js'
import { StandingsModule } from '../standings/standings.module.js'

@Module({
  imports: [StandingsModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository],
  exports: [MatchesService],
})
export class MatchesModule {}
