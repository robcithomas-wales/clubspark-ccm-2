import { Module } from '@nestjs/common'
import { OrganisationsController } from './organisations.controller.js'
import { OrganisationsService } from './organisations.service.js'
import { OrganisationsRepository } from './organisations.repository.js'

@Module({
  controllers: [OrganisationsController],
  providers: [OrganisationsService, OrganisationsRepository],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
