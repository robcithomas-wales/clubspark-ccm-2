import { Module } from '@nestjs/common'
import { CampaignsService } from './campaigns.service.js'
import { CampaignsController } from './campaigns.controller.js'
import { CampaignsScheduler } from './campaigns.scheduler.js'
import { SendRulesModule } from '../send-rules/send-rules.module.js'
import { TemplatesModule } from '../templates/templates.module.js'
import { DeliveryModule } from '../delivery/delivery.module.js'
import { MessageLogModule } from '../message-log/message-log.module.js'

@Module({
  imports: [SendRulesModule, TemplatesModule, DeliveryModule, MessageLogModule],
  providers: [CampaignsService, CampaignsScheduler],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
