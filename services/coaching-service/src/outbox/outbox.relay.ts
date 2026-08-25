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
    private readonly events: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async flush() {
    try {
      // Claim inside a short transaction, publish OUTSIDE it — see the note on
      // claimBatch: an HTTP fan-out inside the claim transaction exceeded
      // Prisma's 5s timeout and rolled back the outcome writes with it.
      const batch = await this.prisma.$transaction((tx) => this.outbox.claimBatch(tx, BATCH_SIZE), {
        timeout: CLAIM_TIMEOUT_MS,
      })
      for (const row of batch) {
        if (row.attempts >= MAX_ATTEMPTS) continue
        try {
          await this.events.publish(row.payload)
          await this.outbox.markPublished(this.prisma, row.id)
        } catch (err) {
          await this.outbox.markFailed(this.prisma, row.id, row.attempts, String(err))
        }
      }
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
