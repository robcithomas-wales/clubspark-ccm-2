import { Module } from '@nestjs/common'
import { HouseholdsController } from './households.controller.js'
import { HouseholdsService } from './households.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
  imports: [PrismaModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule {}
