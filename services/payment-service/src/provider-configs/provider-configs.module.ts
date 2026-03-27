import { Module } from '@nestjs/common'
import { ProviderConfigsController } from './provider-configs.controller.js'
import { ProviderConfigsService } from './provider-configs.service.js'
import { ProviderConfigsRepository } from './provider-configs.repository.js'

@Module({
  controllers: [ProviderConfigsController],
  providers: [ProviderConfigsService, ProviderConfigsRepository],
  exports: [ProviderConfigsRepository],
})
export class ProviderConfigsModule {}
