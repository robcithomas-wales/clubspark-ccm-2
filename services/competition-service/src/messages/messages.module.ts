import { Module } from '@nestjs/common'
import { MessagesController } from './messages.controller.js'
import { MessagesService } from './messages.service.js'
import { MessagesRepository } from './messages.repository.js'

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRepository],
})
export class MessagesModule {}
