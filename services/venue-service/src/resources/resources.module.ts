import { Module } from '@nestjs/common'
import { ResourcesController } from './resources.controller.js'
import { ResourcesService } from './resources.service.js'
import { ResourcesRepository } from './resources.repository.js'
import { OutboxModule } from '../outbox/outbox.module.js'

@Module({
  imports: [OutboxModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}
