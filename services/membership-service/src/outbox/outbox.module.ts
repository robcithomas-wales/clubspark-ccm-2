import { Module } from '@nestjs/common'
import { OutboxRepository } from './outbox.repository'
import { OutboxRelay } from './outbox.relay'
import { EventBusModule } from '../event-bus/event-bus.module'

@Module({
  imports: [EventBusModule],
  providers: [OutboxRepository, OutboxRelay],
  exports: [OutboxRepository],
})
export class OutboxModule {}
