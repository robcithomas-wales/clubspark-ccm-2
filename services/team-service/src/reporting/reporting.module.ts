import { Module } from '@nestjs/common'
import { ReportingController } from './reporting.controller.js'
import { ReportingService } from './reporting.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
  imports: [PrismaModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
