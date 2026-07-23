import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { WebhookSubscription } from '../generated/prisma/index.js'

@Injectable()
export class WebhookSubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenantId: string
    name: string
    endpointUrl: string
    secretHash: string
    eventTypes: string[]
  }): Promise<WebhookSubscription> {
    return this.prisma.write.webhookSubscription.create({ data })
  }

  async findAllByTenant(tenantId: string): Promise<WebhookSubscription[]> {
    return this.prisma.read.webhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string): Promise<WebhookSubscription | null> {
    return this.prisma.read.webhookSubscription.findFirst({
      where: { id, tenantId },
    })
  }

  async findActiveForEvent(tenantId: string, eventType: string): Promise<WebhookSubscription[]> {
    return this.prisma.read.webhookSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        eventTypes: { has: eventType },
      },
    })
  }

  async update(
    id: string,
    data: { name?: string; endpointUrl?: string; eventTypes?: string[]; isActive?: boolean },
  ): Promise<WebhookSubscription> {
    return this.prisma.write.webhookSubscription.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.write.webhookSubscription.delete({ where: { id } })
  }
}
