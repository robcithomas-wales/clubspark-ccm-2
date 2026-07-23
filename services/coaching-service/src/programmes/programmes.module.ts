import { Module } from '@nestjs/common'
import { ProgrammesController } from './programmes.controller.js'
import { ProgrammesService } from './programmes.service.js'
import { ProgrammesRepository } from './programmes.repository.js'

@Module({
  controllers: [ProgrammesController],
  providers: [ProgrammesService, ProgrammesRepository],
  exports: [ProgrammesService],
})
export class ProgrammesModule {}
