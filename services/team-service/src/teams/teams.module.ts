import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { TeamsController } from './teams.controller.js'
import { TeamsService } from './teams.service.js'
import { TeamsRepository } from './teams.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
