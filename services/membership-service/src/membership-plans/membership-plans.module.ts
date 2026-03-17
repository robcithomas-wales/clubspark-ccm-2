import { Module } from '@nestjs/common'
import { MembershipPlansController } from './membership-plans.controller'
import { MembershipPlansService } from './membership-plans.service'
import { MembershipPlansRepository } from './membership-plans.repository'

@Module({
  controllers: [MembershipPlansController],
  providers: [MembershipPlansService, MembershipPlansRepository],
  exports: [MembershipPlansRepository],
})
export class MembershipPlansModule {}
