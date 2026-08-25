import { Module } from '@nestjs/common'
import { EventBusModule } from '../event-bus/event-bus.module.js'
import { OutboxRepository } from './outbox.repository.js'
import { OutboxRelay } from './outbox.relay.js'

@Module({
  imports: [EventBusModule],
  providers: [OutboxRepository, OutboxRelay],
  exports: [OutboxRepository],
})
export class OutboxModule {}
