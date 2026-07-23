import { Module } from '@nestjs/common'
import { OverridesController } from './overrides.controller.js'
import { OverridesService } from './overrides.service.js'
import { OverridesRepository } from './overrides.repository.js'

@Module({
  controllers: [OverridesController],
  providers: [OverridesService, OverridesRepository],
})
export class OverridesModule {}
