import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { MAX_ATTEMPTS, OutboxRepository } from './outbox.repository.js'

const BATCH_SIZE = 50
const CLAIM_TIMEOUT_MS = 15_000

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
      // Claim inside a short transaction, publish OUTSIDE it. Publishing inside
      // the claim blew Prisma's 5s transaction timeout as soon as Booking was
      // slow, and the outcome writes rolled back with it — so `attempts` never
      // advanced and dead-lettering could never trigger. It also pinned Venue's
      // single pooled write connection across the whole fan-out.
      const batch = await this.prisma.write.$transaction(
        (tx) => this.outbox.claimBatch(tx, BATCH_SIZE),
        { timeout: CLAIM_TIMEOUT_MS },
      )
      for (const row of batch) {
        if (row.attempts >= MAX_ATTEMPTS) continue
        try {
          await this.eventBus.publish(row.payload)
          await this.outbox.markPublished(this.prisma.write, row.id)
        } catch (err) {
          await this.outbox.markFailed(this.prisma.write, row.id, row.attempts, String(err))
          this.logger.warn(
            { eventId: row.id, attempts: row.attempts + 1 },
            'Venue projection event delivery failed — will retry with backoff',
          )
        }
      }
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
