import { Module } from '@nestjs/common'
import { MembershipSchemesController } from './membership-schemes.controller'
import { MembershipSchemesService } from './membership-schemes.service'
import { MembershipSchemesRepository } from './membership-schemes.repository'

@Module({
  controllers: [MembershipSchemesController],
  providers: [MembershipSchemesService, MembershipSchemesRepository],
  exports: [MembershipSchemesRepository],
})
export class MembershipSchemesModule {}
