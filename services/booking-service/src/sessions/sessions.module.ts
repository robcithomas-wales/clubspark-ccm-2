import { Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller.js'
import { SessionsService } from './sessions.service.js'
import { SessionsRepository } from './sessions.repository.js'

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}
