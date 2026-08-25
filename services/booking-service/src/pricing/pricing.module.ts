import { Module } from '@nestjs/common'
import { PricingController } from './pricing.controller.js'
import { PricingService } from './pricing.service.js'
import { PricingRepository } from './pricing.repository.js'
import { MembershipModule } from '../membership/membership.module.js'
import { ProjectionsModule } from '../projections/projections.module.js'

@Module({
  imports: [MembershipModule, ProjectionsModule],
  controllers: [PricingController],
  providers: [PricingService, PricingRepository],
  exports: [PricingService],
})
export class PricingModule {}
