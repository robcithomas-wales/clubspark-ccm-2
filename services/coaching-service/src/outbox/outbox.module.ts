import { Module } from '@nestjs/common'
import { EventBusModule } from '../event-bus/event-bus.module.js'
import { OutboxRepository } from './outbox.repository.js'
import { OutboxRelay } from './outbox.relay.js'
import { OutboxOperationsController } from './outbox-operations.controller.js'
import { OutboxOperationsService } from './outbox-operations.service.js'

@Module({
  imports: [EventBusModule],
  controllers: [OutboxOperationsController],
  providers: [OutboxRepository, OutboxRelay, OutboxOperationsService],
  exports: [OutboxRepository],
})
export class OutboxModule {}
