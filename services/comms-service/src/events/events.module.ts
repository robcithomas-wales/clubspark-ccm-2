import { Module } from '@nestjs/common'
import { EventsController } from './events.controller.js'
import { NotificationsModule } from '../notifications/notifications.module.js'
import { EventInboxService } from './event-inbox.service.js'

@Module({
  imports: [NotificationsModule],
  controllers: [EventsController],
  providers: [EventInboxService],
})
export class EventsModule {}
