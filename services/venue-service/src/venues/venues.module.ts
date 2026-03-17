import { Module } from '@nestjs/common'
import { VenuesController } from './venues.controller.js'
import { VenuesService } from './venues.service.js'
import { VenuesRepository } from './venues.repository.js'

@Module({
  controllers: [VenuesController],
  providers: [VenuesService, VenuesRepository],
  exports: [VenuesService],
})
export class VenuesModule {}
