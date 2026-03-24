import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { SelectionController } from './selection.controller.js'
import { SelectionService } from './selection.service.js'
import { SelectionRepository } from './selection.repository.js'
import { FixturesRepository } from '../fixtures/fixtures.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [SelectionController],
  providers: [SelectionService, SelectionRepository, FixturesRepository],
  exports: [SelectionService],
})
export class SelectionModule {}
