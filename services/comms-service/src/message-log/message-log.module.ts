import { Module } from '@nestjs/common'
import { MessageLogRepository } from './message-log.repository.js'
import { MessageLogController } from './message-log.controller.js'

@Module({
  providers: [MessageLogRepository],
  controllers: [MessageLogController],
  exports: [MessageLogRepository],
})
export class MessageLogModule {}
