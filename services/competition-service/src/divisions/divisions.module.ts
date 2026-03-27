import { Module } from '@nestjs/common'
import { DivisionsController } from './divisions.controller.js'
import { DivisionsService } from './divisions.service.js'
import { DivisionsRepository } from './divisions.repository.js'

@Module({
  controllers: [DivisionsController],
  providers: [DivisionsService, DivisionsRepository],
  exports: [DivisionsService],
})
export class DivisionsModule {}
