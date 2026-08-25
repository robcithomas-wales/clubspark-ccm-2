import { Module } from '@nestjs/common'
import { ResourceGroupsController } from './resource-groups.controller'
import { ResourceGroupsService } from './resource-groups.service'
import { ResourceGroupsRepository } from './resource-groups.repository'
import { OutboxModule } from '../outbox/outbox.module.js'

@Module({
  imports: [OutboxModule],
  controllers: [ResourceGroupsController],
  providers: [ResourceGroupsService, ResourceGroupsRepository],
  exports: [ResourceGroupsService],
})
export class ResourceGroupsModule {}
