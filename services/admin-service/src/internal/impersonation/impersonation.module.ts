import { Module } from '@nestjs/common'
import { ImpersonationController } from './impersonation.controller.js'
import { ImpersonationService } from './impersonation.service.js'
import { AuditModule } from '../audit/audit.module.js'

@Module({
  imports: [AuditModule],
  controllers: [ImpersonationController],
  providers: [ImpersonationService],
})
export class ImpersonationModule {}
