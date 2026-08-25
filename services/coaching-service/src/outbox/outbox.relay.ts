import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { OutboxRepository } from './outbox.repository.js'

@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly events: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async flush() {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of await this.outbox.claimBatch(tx, 50)) {
          try {
            await this.events.publish(row.payload)
            await this.outbox.markPublished(tx, row.id)
          } catch (err) {
            await this.outbox.markFailed(tx, row.id, row.attempts, String(err))
          }
        }
      })
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Coaching outbox relay pass failed')
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reportDeadLettered() {
    try {
      const count = await this.outbox.countDeadLettered()
      if (count) this.logger.error({ count }, 'Coaching projection events exhausted retries')
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Coaching outbox dead-letter check failed')
    }
  }
}
