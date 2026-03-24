import { Module } from '@nestjs/common'
import { LessonTypesController } from './lesson-types.controller.js'
import { LessonTypesService } from './lesson-types.service.js'
import { LessonTypesRepository } from './lesson-types.repository.js'

@Module({
  controllers: [LessonTypesController],
  providers: [LessonTypesService, LessonTypesRepository],
  exports: [LessonTypesService],
})
export class LessonTypesModule {}
