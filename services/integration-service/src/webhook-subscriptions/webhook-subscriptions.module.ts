import { Module } from '@nestjs/common'
import { WebhookSubscriptionsController } from './webhook-subscriptions.controller.js'
import { WebhookSubscriptionsService } from './webhook-subscriptions.service.js'
import { WebhookSubscriptionsRepository } from './webhook-subscriptions.repository.js'

@Module({
  controllers: [WebhookSubscriptionsController],
  providers: [WebhookSubscriptionsService, WebhookSubscriptionsRepository],
  exports: [WebhookSubscriptionsRepository],
})
export class WebhookSubscriptionsModule {}
