import { Module } from '@nestjs/common'
import { WebhookDeliveriesController } from './webhook-deliveries.controller.js'
import { WebhookDeliveriesService } from './webhook-deliveries.service.js'
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository.js'
import { WebhookSubscriptionsRepository } from '../webhook-subscriptions/webhook-subscriptions.repository.js'

@Module({
  controllers: [WebhookDeliveriesController],
  providers: [WebhookDeliveriesService, WebhookDeliveriesRepository, WebhookSubscriptionsRepository],
  exports: [WebhookDeliveriesService],
})
export class WebhookDeliveriesModule {}
