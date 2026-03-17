import { Module } from '@nestjs/common'
import {
  EntitlementPoliciesController,
  PlanEntitlementsController,
} from './entitlement-policies.controller'
import { EntitlementPoliciesService } from './entitlement-policies.service'
import { EntitlementPoliciesRepository } from './entitlement-policies.repository'

@Module({
  controllers: [EntitlementPoliciesController, PlanEntitlementsController],
  providers: [EntitlementPoliciesService, EntitlementPoliciesRepository],
})
export class EntitlementPoliciesModule {}
