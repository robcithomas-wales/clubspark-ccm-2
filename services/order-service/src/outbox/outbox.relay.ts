import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService, type DomainEvent } from '../event-bus/event-bus.service.js'
import { MAX_ATTEMPTS, OutboxRepository } from './outbox.repository.js'

const BATCH_SIZE = 50

@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly events: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async flush(): Promise<void> {
    try {
      await this.prisma.write.$transaction(async (tx) => {
        const batch = await this.outbox.claimBatch(tx, BATCH_SIZE)
        for (const row of batch) {
          if (row.attempts >= MAX_ATTEMPTS) continue
          try {
            await this.events.publishDurably({
              ...row.payload,
              eventId: row.payload.eventId ?? row.id,
              correlationId: row.payload.correlationId ?? row.id,
              schemaVersion: row.payload.schemaVersion ?? 1,
              producer: row.payload.producer ?? 'order-service',
            } as DomainEvent)
            await this.outbox.markPublished(tx, row.id)
          } catch (err) {
            await this.outbox.markFailed(tx, row.id, row.attempts, String(err))
          }
        }
      })
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Outbox relay pass failed')
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reportDeadLettered(): Promise<void> {
    try {
      const count = await this.outbox.countDeadLettered()
      if (count > 0) {
        this.logger.error(
          { count, maxAttempts: MAX_ATTEMPTS },
          'UNDELIVERED EVENTS: commerce outbox rows exhausted retries',
        )
      }
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'Could not count dead-lettered outbox events')
    }
  }
}
