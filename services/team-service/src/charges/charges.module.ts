import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { ChargesController } from './charges.controller.js'
import { ChargesService } from './charges.service.js'
import { ChargesRepository } from './charges.repository.js'
import { FixturesRepository } from '../fixtures/fixtures.repository.js'
import { SelectionRepository } from '../selection/selection.repository.js'
import { TeamsRepository } from '../teams/teams.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [ChargesController],
  providers: [ChargesService, ChargesRepository, FixturesRepository, SelectionRepository, TeamsRepository],
})
export class ChargesModule {}
