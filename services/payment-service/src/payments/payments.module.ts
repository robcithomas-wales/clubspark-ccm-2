import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller.js'
import { PaymentsService } from './payments.service.js'
import { PaymentsRepository } from './payments.repository.js'
import { ProviderConfigsModule } from '../provider-configs/provider-configs.module.js'

@Module({
  imports: [ProviderConfigsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
