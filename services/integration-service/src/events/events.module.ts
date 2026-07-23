import { Module } from '@nestjs/common'
import { EventsController } from './events.controller.js'
import { WebhookDeliveriesModule } from '../webhook-deliveries/webhook-deliveries.module.js'
import { AccountingSyncModule } from '../accounting-sync/accounting-sync.module.js'

@Module({
  imports: [WebhookDeliveriesModule, AccountingSyncModule],
  controllers: [EventsController],
})
export class EventsModule {}
