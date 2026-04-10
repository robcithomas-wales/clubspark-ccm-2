import { Module } from '@nestjs/common'
import { DisciplineController } from './discipline.controller.js'
import { DisciplineService } from './discipline.service.js'
import { DisciplineRepository } from './discipline.repository.js'
import { AuditModule } from '../audit/audit.module.js'

@Module({
  imports: [AuditModule],
  controllers: [DisciplineController],
  providers: [DisciplineService, DisciplineRepository],
})
export class DisciplineModule {}
