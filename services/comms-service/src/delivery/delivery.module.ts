import { Module } from '@nestjs/common'
import { EmailDeliveryService } from './email-delivery.service.js'
import { SmsDeliveryService } from './sms-delivery.service.js'
import { MessageLogModule } from '../message-log/message-log.module.js'

@Module({
  imports: [MessageLogModule],
  providers: [EmailDeliveryService, SmsDeliveryService],
  exports: [EmailDeliveryService, SmsDeliveryService],
})
export class DeliveryModule {}
