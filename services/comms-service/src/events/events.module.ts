import { Module } from '@nestjs/common'
import { EventsController } from './events.controller.js'
import { NotificationsModule } from '../notifications/notifications.module.js'

@Module({
  imports: [NotificationsModule],
  controllers: [EventsController],
})
export class EventsModule {}
