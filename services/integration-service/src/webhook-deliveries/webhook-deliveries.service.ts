import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { createHmac } from 'crypto'
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository.js'
import { WebhookSubscriptionsRepository } from '../webhook-subscriptions/webhook-subscriptions.repository.js'

const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000, 14_400_000] // 30s, 2m, 10m, 1h, 4h
const MAX_ATTEMPTS = 5

export interface InboundEvent {
  type: string
  tenantId: string
  occurredAt: string
  [key: string]: unknown
}

@Injectable()
export class WebhookDeliveriesService {
  private readonly logger = new Logger(WebhookDeliveriesService.name)

  constructor(
    private readonly deliveriesRepo: WebhookDeliveriesRepository,
    private readonly subscriptionsRepo: WebhookSubscriptionsRepository,
  ) {}

  async dispatch(event: InboundEvent): Promise<void> {
    const subscriptions = await this.subscriptionsRepo.findActiveForEvent(
      event.tenantId,
      event.type,
    )
    if (!subscriptions.length) return

    await this.deliveriesRepo.createMany(
      subscriptions.map((s) => ({
        subscriptionId: s.id,
        eventType: event.type,
        payload: event as object,
        nextRetryAt: new Date(),
      })),
    )

    this.logger.log(`[Dispatch] ${event.type} → ${subscriptions.length} subscription(s) queued`)
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPending(): Promise<void> {
    // claimPending atomically moves nextRetryAt beyond the HTTP timeout while
    // holding row locks. A second replica skips these rows; a crashed worker's
    // lease expires and makes them eligible again.
    const due = await this.deliveriesRepo.claimPending(50, 30)
    if (!due.length) return

    this.logger.log(`[Worker] Processing ${due.length} pending deliveries`)
    await Promise.allSettled(due.map((d) => this.attempt(d)))
  }

  async listBySubscription(tenantId: string, subscriptionId: string, page = 1, limit = 50) {
    // Ownership check: the subscription (and therefore its deliveries) must belong
    // to the caller's tenant. WebhookDelivery has no tenantId of its own — tenancy
    // is derived via subscription.tenantId, so verify the subscription first.
    const subscription = await this.subscriptionsRepo.findById(tenantId, subscriptionId)
    if (!subscription)
      throw new NotFoundException(`Webhook subscription ${subscriptionId} not found`)

    const { data, total } = await this.deliveriesRepo.findBySubscription(
      subscriptionId,
      page,
      limit,
    )
    return {
      data: data.map((d) => ({
        id: d.id,
        eventType: d.eventType,
        status: d.status,
        attempts: d.attempts,
        responseCode: d.responseCode,
        nextRetryAt: d.nextRetryAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async retry(tenantId: string, id: string) {
    // Ownership check via the parent subscription's tenantId (delivery has none).
    const delivery = await this.deliveriesRepo.findById(tenantId, id)
    if (!delivery) throw new NotFoundException(`Delivery ${id} not found`)
    await this.deliveriesRepo.resetForRetry(id)
    return { success: true }
  }

  private async attempt(delivery: {
    id: string
    subscriptionId: string
    eventType: string
    payload: unknown
    attempts: number
    subscription: { endpointUrl: string; secretHash: string }
  }): Promise<void> {
    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.eventType,
      payload: delivery.payload,
      timestamp: new Date().toISOString(),
    })

    const signature = createHmac('sha256', delivery.subscription.secretHash)
      .update(body)
      .digest('hex')

    let responseCode: number | null = null
    let responseBody: string | null = null
    let succeeded = false

    try {
      const res = await fetch(delivery.subscription.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ClubSpark-Signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      responseCode = res.status
      responseBody = await res.text().catch(() => null)
      succeeded = res.ok
    } catch (err) {
      this.logger.warn(`[Worker] Delivery ${delivery.id} failed: ${String(err)}`)
    }

    const newAttempts = delivery.attempts + 1

    if (succeeded) {
      await this.deliveriesRepo.updateStatus(delivery.id, {
        status: 'delivered',
        attempts: newAttempts,
        responseCode,
        responseBody,
        nextRetryAt: null,
      })
      return
    }

    if (newAttempts >= MAX_ATTEMPTS) {
      await this.deliveriesRepo.updateStatus(delivery.id, {
        status: 'dead',
        attempts: newAttempts,
        responseCode,
        responseBody,
        nextRetryAt: null,
      })
      this.logger.warn(`[Worker] Delivery ${delivery.id} dead after ${MAX_ATTEMPTS} attempts`)
      return
    }

    const delay = RETRY_DELAYS_MS[newAttempts - 1] ?? RETRY_DELAYS_MS.at(-1)!
    await this.deliveriesRepo.updateStatus(delivery.id, {
      status: 'failed',
      attempts: newAttempts,
      responseCode,
      responseBody,
      nextRetryAt: new Date(Date.now() + delay),
    })
  }
}
