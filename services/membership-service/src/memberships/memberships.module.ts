import { Module } from '@nestjs/common'
import { MembershipsController } from './memberships.controller'
import { MembershipsService } from './memberships.service'
import { MembershipsRepository } from './memberships.repository'
import { MembershipPlansModule } from '../membership-plans/membership-plans.module'
import { MembershipExpiryTask } from './tasks/membership-expiry.task'

@Module({
  imports: [MembershipPlansModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsRepository, MembershipExpiryTask],
})
export class MembershipsModule {}
