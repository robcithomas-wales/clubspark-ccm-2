import { Module } from '@nestjs/common'
import { RefundPoliciesController } from './refund-policies.controller.js'
import { RefundPoliciesService } from './refund-policies.service.js'
import { RefundPoliciesRepository } from './refund-policies.repository.js'

@Module({
  controllers: [RefundPoliciesController],
  providers: [RefundPoliciesService, RefundPoliciesRepository],
  exports: [RefundPoliciesRepository],
})
export class RefundPoliciesModule {}
