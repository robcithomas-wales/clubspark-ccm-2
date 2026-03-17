import { Module } from '@nestjs/common'
import { AddOnsController } from './add-ons.controller.js'
import { AddOnsService } from './add-ons.service.js'
import { AddOnsRepository } from './add-ons.repository.js'

@Module({
  controllers: [AddOnsController],
  providers: [AddOnsService, AddOnsRepository],
  exports: [AddOnsService],
})
export class AddOnsModule {}
