import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { MAX_ATTEMPTS, OutboxRepository } from './outbox.repository.js'

@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async flush(): Promise<void> {
    try {
      await this.prisma.write.$transaction(async (tx) => {
        const batch = await this.outbox.claimBatch(tx, 50)
        for (const row of batch) {
          if (row.attempts >= MAX_ATTEMPTS) continue
          try {
            await this.eventBus.publish(row.payload)
            await this.outbox.markPublished(tx, row.id)
          } catch (err) {
            await this.outbox.markFailed(tx, row.id, row.attempts, String(err))
          }
        }
      })
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Venue outbox relay pass failed')
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reportDeadLettered(): Promise<void> {
    try {
      const count = await this.outbox.countDeadLettered()
      if (count > 0) {
        this.logger.error({ count }, 'Venue projection events exhausted retries')
      }
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Venue outbox dead-letter check failed')
    }
  }
}
