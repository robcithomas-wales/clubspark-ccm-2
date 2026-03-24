import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { FixturesController } from './fixtures.controller.js'
import { FixturesService } from './fixtures.service.js'
import { FixturesRepository } from './fixtures.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [FixturesController],
  providers: [FixturesService, FixturesRepository],
  exports: [FixturesService, FixturesRepository],
})
export class FixturesModule {}
