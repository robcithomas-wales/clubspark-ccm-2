import { Module } from '@nestjs/common'
import { AttendanceController } from './attendance.controller.js'
import { AttendanceService } from './attendance.service.js'
import { AttendanceRepository } from './attendance.repository.js'
import { ProgrammesRepository } from '../programmes/programmes.repository.js'
import { EnrolmentsRepository } from '../enrolments/enrolments.repository.js'

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, ProgrammesRepository, EnrolmentsRepository],
})
export class AttendanceModule {}
