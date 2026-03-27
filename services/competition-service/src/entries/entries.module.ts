import { Module } from '@nestjs/common'
import { EntriesController } from './entries.controller.js'
import { EntriesService } from './entries.service.js'
import { EntriesRepository } from './entries.repository.js'

@Module({
  controllers: [EntriesController],
  providers: [EntriesService, EntriesRepository],
  exports: [EntriesService],
})
export class EntriesModule {}
