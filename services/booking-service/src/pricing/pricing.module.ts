import { Module } from '@nestjs/common'
import { PricingController } from './pricing.controller.js'
import { PricingService } from './pricing.service.js'
import { PricingRepository } from './pricing.repository.js'
import { MembershipModule } from '../membership/membership.module.js'

@Module({
  imports: [MembershipModule],
  controllers: [PricingController],
  providers: [PricingService, PricingRepository],
  exports: [PricingService],
})
export class PricingModule {}
