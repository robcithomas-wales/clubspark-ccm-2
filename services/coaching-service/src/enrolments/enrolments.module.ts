import { Module } from '@nestjs/common'
import { EnrolmentsController } from './enrolments.controller.js'
import { EnrolmentsService } from './enrolments.service.js'
import { EnrolmentsRepository } from './enrolments.repository.js'
import { ProgrammesRepository } from '../programmes/programmes.repository.js'

@Module({
  controllers: [EnrolmentsController],
  providers: [EnrolmentsService, EnrolmentsRepository, ProgrammesRepository],
})
export class EnrolmentsModule {}
