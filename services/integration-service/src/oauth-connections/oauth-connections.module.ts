import { Module } from '@nestjs/common'
import { OAuthConnectionsController } from './oauth-connections.controller.js'
import { OAuthConnectionsService } from './oauth-connections.service.js'
import { OAuthConnectionsRepository } from './oauth-connections.repository.js'

@Module({
  controllers: [OAuthConnectionsController],
  providers: [OAuthConnectionsService, OAuthConnectionsRepository],
  exports: [OAuthConnectionsService],
})
export class OAuthConnectionsModule {}
