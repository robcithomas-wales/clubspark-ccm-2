import { Module } from '@nestjs/common'
import { SponsorsController } from './sponsors.controller.js'
import { SponsorsService } from './sponsors.service.js'
import { SponsorsRepository } from './sponsors.repository.js'

@Module({
  controllers: [SponsorsController],
  providers: [SponsorsService, SponsorsRepository],
  exports: [SponsorsService],
})
export class SponsorsModule {}
