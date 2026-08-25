import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { OutboxRepository, MAX_ATTEMPTS } from './outbox.repository.js'
import type { DomainEvent } from '../event-bus/event-bus.service.js'

/** How many events one pass will attempt. Keeps a backlog from blocking a tick. */
const BATCH_SIZE = 50

/** Only the claim runs in a transaction now, so this is generous. */
const CLAIM_TIMEOUT_MS = 15_000

/**
 * Delivers events recorded in the outbox.
 *
 * The publisher writes the event in the same transaction as the state change;
 * this relay is what actually sends it, and keeps retrying until it succeeds.
 * That is the difference between "we tried to publish" and "the event will be
 * delivered".
 *
 * Safe at more than one replica: the batch is claimed with FOR UPDATE SKIP
 * LOCKED, so instances never deliver the same event. This relay therefore does
 * NOT need the leader election in MR-6 — unlike the other @Cron jobs, which do.
 */
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
      await this.deliverBatch()
    } catch (err) {
      // A relay tick must never reject unhandled — that is silent, and silence is
      // exactly the failure mode the outbox exists to remove.
      this.logger.error({ err: String(err) }, 'Outbox relay pass failed')
    }
  }

  private async deliverBatch(): Promise<void> {
    // Claim inside a short transaction, publish OUTSIDE it, then record each
    // outcome in its own statement. Publishing inside the claim transaction blew
    // Prisma's 5s transaction timeout as soon as a consumer was slow — and on
    // abort the markPublished/markFailed writes rolled back with it, so
    // `attempts` never advanced and dead-lettering could never trigger.
    const batch = await this.prisma.write.$transaction(
      (tx) => this.outbox.claimBatch(tx, BATCH_SIZE),
      {
        timeout: CLAIM_TIMEOUT_MS,
      },
    )
    if (batch.length === 0) return

    for (const row of batch) {
      if (row.attempts >= MAX_ATTEMPTS) {
        // Leave it claimed-but-unpublished. Dead-lettered rows stay visible in
        // the table rather than being deleted, so the loss is auditable.
        continue
      }
      try {
        await this.eventBus.publishDurably({
          ...row.payload,
          eventId: row.payload.eventId ?? row.id,
          correlationId: row.payload.correlationId ?? row.id,
          schemaVersion: row.payload.schemaVersion ?? 1,
          producer: row.payload.producer ?? 'payment-service',
        } as DomainEvent)
        await this.outbox.markPublished(this.prisma.write, row.id)
      } catch (err) {
        await this.outbox.markFailed(this.prisma.write, row.id, row.attempts, String(err))
        this.logger.warn(
          { eventId: row.id, type: row.eventType, attempts: row.attempts + 1 },
          'Outbox delivery failed — will retry with backoff',
        )
      }
    }
  }

  /**
   * Hourly visibility on events that have exhausted their retries.
   *
   * Without this, a permanently failing subscriber is invisible: the rows simply
   * accumulate. Losing payment or booking state silently is precisely what this
   * whole mechanism is meant to prevent, so it is worth a loud log.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reportDeadLettered(): Promise<void> {
    try {
      const n = await this.outbox.countDeadLettered()
      if (n > 0) {
        this.logger.error(
          { count: n, maxAttempts: MAX_ATTEMPTS },
          'UNDELIVERED EVENTS: outbox rows have exhausted their retries — manual intervention required',
        )
      }
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'Could not count dead-lettered outbox events')
    }
  }
}
