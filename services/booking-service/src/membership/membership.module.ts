import { Module } from '@nestjs/common'
import { MembershipClient } from './membership.client.js'

@Module({
  providers: [MembershipClient],
  exports: [MembershipClient],
})
export class MembershipModule {}
