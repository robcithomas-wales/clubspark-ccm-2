import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AvailabilityController } from './availability.controller.js'
import { AvailabilityService } from './availability.service.js'
import { AvailabilityRepository } from './availability.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityRepository],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
