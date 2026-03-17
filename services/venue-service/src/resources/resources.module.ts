import { Module } from '@nestjs/common'
import { ResourcesController } from './resources.controller.js'
import { ResourcesService } from './resources.service.js'
import { ResourcesRepository } from './resources.repository.js'

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}
