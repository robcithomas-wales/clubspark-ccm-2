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

  async findPending(limit: number): Promise<
    (WebhookDelivery & { subscription: { endpointUrl: string; secretHash: string } })[]
  > {
    return this.prisma.read.webhookDelivery.findMany({
      where: { status: 'pending', nextRetryAt: { lte: new Date() } },
      include: { subscription: { select: { endpointUrl: true, secretHash: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }) as Promise<(WebhookDelivery & { subscription: { endpointUrl: string; secretHash: string } })[]>
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

  async findById(id: string): Promise<WebhookDelivery | null> {
    return this.prisma.read.webhookDelivery.findUnique({ where: { id } })
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
