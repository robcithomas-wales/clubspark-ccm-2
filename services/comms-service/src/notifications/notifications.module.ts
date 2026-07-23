import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service.js'
import { TemplatesModule } from '../templates/templates.module.js'
import { SendRulesModule } from '../send-rules/send-rules.module.js'
import { DeliveryModule } from '../delivery/delivery.module.js'
import { MessageLogModule } from '../message-log/message-log.module.js'

@Module({
  imports: [TemplatesModule, SendRulesModule, DeliveryModule, MessageLogModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
