import { Module } from '@nestjs/common'
import { SegmentsController } from './segments.controller.js'
import { SegmentsService } from './segments.service.js'
import { SegmentsRepository } from './segments.repository.js'

@Module({
  controllers: [SegmentsController],
  providers: [SegmentsService, SegmentsRepository],
})
export class SegmentsModule {}
