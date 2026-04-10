import { Module } from '@nestjs/common'
import { WorkCardsController } from './work-cards.controller.js'
import { WorkCardsService } from './work-cards.service.js'
import { WorkCardsRepository } from './work-cards.repository.js'
import { AuditModule } from '../audit/audit.module.js'

@Module({
  imports: [AuditModule],
  controllers: [WorkCardsController],
  providers: [WorkCardsService, WorkCardsRepository],
})
export class WorkCardsModule {}
