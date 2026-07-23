import { Module } from '@nestjs/common'
import { ApiKeysController } from './api-keys.controller.js'
import { ApiKeysService } from './api-keys.service.js'
import { ApiKeysRepository } from './api-keys.repository.js'

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysRepository],
  exports: [ApiKeysRepository],
})
export class ApiKeysModule {}
