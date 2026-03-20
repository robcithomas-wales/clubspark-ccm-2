import { Module } from '@nestjs/common'
import { TagsController, PersonTagsController } from './tags.controller.js'
import { TagsService } from './tags.service.js'
import { TagsRepository } from './tags.repository.js'

@Module({
  controllers: [TagsController, PersonTagsController],
  providers: [TagsService, TagsRepository],
  exports: [TagsService],
})
export class TagsModule {}
