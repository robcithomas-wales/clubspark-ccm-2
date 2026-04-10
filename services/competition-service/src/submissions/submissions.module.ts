import { Module } from '@nestjs/common'
import { SubmissionsController } from './submissions.controller.js'
import { SubmissionsService } from './submissions.service.js'
import { SubmissionsRepository } from './submissions.repository.js'
import { AuditModule } from '../audit/audit.module.js'

@Module({
  imports: [AuditModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsRepository],
})
export class SubmissionsModule {}
