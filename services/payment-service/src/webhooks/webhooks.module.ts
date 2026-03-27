import { Module } from '@nestjs/common'
import { WebhooksController } from './webhooks.controller.js'
import { WebhooksService } from './webhooks.service.js'
import { ProviderConfigsModule } from '../provider-configs/provider-configs.module.js'
import { PaymentsModule } from '../payments/payments.module.js'

@Module({
  imports: [ProviderConfigsModule, PaymentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
