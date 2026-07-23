import { Module } from '@nestjs/common'
import { PlansController } from './plans.controller.js'
import { PlansService } from './plans.service.js'
import { PlansRepository } from './plans.repository.js'

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansRepository],
})
export class PlansModule {}
