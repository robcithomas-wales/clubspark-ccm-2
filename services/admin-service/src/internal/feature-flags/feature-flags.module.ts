import { Module } from '@nestjs/common'
import { FeatureFlagsController } from './feature-flags.controller.js'
import { FeatureFlagsService } from './feature-flags.service.js'
import { AuditModule } from '../audit/audit.module.js'

@Module({
  imports: [AuditModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
