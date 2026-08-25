import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { WebhookDelivery, WebhookDeliveryStatus } from '../generated/prisma/index.js'

@Injectable()
export class WebhookDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    rows: {
      subscriptionId: string
      eventType: string
      payload: object
      nextRetryAt: Date
    }[],
  ): Promise<void> {
    await this.prisma.write.webhookDelivery.createMany({ data: rows })
  }

  async claimPending(
    limit: number,
    leaseSeconds = 30,
  ): Promise<(WebhookDelivery & { subscription: { endpointUrl: string; secretHash: string } })[]> {
    return this.prisma.write.$transaction(
      (tx) =>
        tx.$queryRaw<
          (WebhookDelivery & { subscription: { endpointUrl: string; secretHash: string } })[]
        >`
        WITH candidates AS (
          SELECT delivery.id
          FROM integration.webhook_deliveries delivery
          WHERE delivery.status IN ('pending', 'failed')
            AND delivery.next_retry_at <= now()
          ORDER BY delivery.created_at
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        ), claimed AS (
          UPDATE integration.webhook_deliveries delivery
          SET next_retry_at = now() + make_interval(secs => ${leaseSeconds}),
              updated_at = now()
          FROM candidates
          WHERE delivery.id = candidates.id
          RETURNING delivery.*
        )
        SELECT
          claimed.id,
          claimed.subscription_id AS "subscriptionId",
          claimed.event_type AS "eventType",
          claimed.payload,
          claimed.status,
          claimed.attempts,
          claimed.next_retry_at AS "nextRetryAt",
          claimed.response_code AS "responseCode",
          claimed.response_body AS "responseBody",
          claimed.created_at AS "createdAt",
          claimed.updated_at AS "updatedAt",
          json_build_object(
            'endpointUrl', subscription.endpoint_url,
            'secretHash', subscription.secret_hash
          ) AS subscription
        FROM claimed
        JOIN integration.webhook_subscriptions subscription
          ON subscription.id = claimed.subscription_id
      `,
    )
  }

  async findBySubscription(
    subscriptionId: string,
    page: number,
    limit: number,
  ): Promise<{ data: WebhookDelivery[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.read.webhookDelivery.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.read.webhookDelivery.count({ where: { subscriptionId } }),
    ])
    return { data, total }
  }

  async findById(tenantId: string, id: string): Promise<WebhookDelivery | null> {
    // Scope by the parent subscription's tenantId — WebhookDelivery has no tenantId
    // column, so ownership must be enforced through the subscription relation.
    return this.prisma.read.webhookDelivery.findFirst({
      where: { id, subscription: { tenantId } },
    })
  }

  async updateStatus(
    id: string,
    data: {
      status: WebhookDeliveryStatus
      attempts: number
      responseCode?: number | null
      responseBody?: string | null
      nextRetryAt?: Date | null
    },
  ): Promise<void> {
    await this.prisma.write.webhookDelivery.update({ where: { id }, data })
  }

  async resetForRetry(id: string): Promise<void> {
    await this.prisma.write.webhookDelivery.update({
      where: { id },
      data: { status: 'pending', attempts: 0, nextRetryAt: new Date() },
    })
  }
}
