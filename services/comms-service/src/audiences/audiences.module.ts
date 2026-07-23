import { Module } from '@nestjs/common'
import { AudiencesController } from './audiences.controller.js'
import { AudiencesService } from './audiences.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'

@Module({
  imports: [PrismaModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
  exports: [AudiencesService],
})
export class AudiencesModule {}
