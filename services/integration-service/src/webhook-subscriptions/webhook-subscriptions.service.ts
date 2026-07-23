import { Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes, createHash } from 'crypto'
import { WebhookSubscriptionsRepository } from './webhook-subscriptions.repository.js'
import type { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto.js'
import type { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto.js'

@Injectable()
export class WebhookSubscriptionsService {
  constructor(private readonly repo: WebhookSubscriptionsRepository) {}

  async create(tenantId: string, dto: CreateWebhookSubscriptionDto) {
    const rawSecret = randomBytes(32).toString('hex')
    const secretHash = createHash('sha256').update(rawSecret).digest('hex')

    const sub = await this.repo.create({
      tenantId,
      name: dto.name,
      endpointUrl: dto.endpointUrl,
      eventTypes: dto.eventTypes,
      secretHash,
    })

    return {
      ...this.toSummary(sub),
      secret: rawSecret,
    }
  }

  async list(tenantId: string) {
    const subs = await this.repo.findAllByTenant(tenantId)
    return { data: subs.map(this.toSummary) }
  }

  async update(tenantId: string, id: string, dto: UpdateWebhookSubscriptionDto) {
    await this.assertExists(tenantId, id)
    const updated = await this.repo.update(id, dto)
    return this.toSummary(updated)
  }

  async remove(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await this.repo.delete(id)
    return { success: true }
  }

  private toSummary(s: {
    id: string
    name: string
    endpointUrl: string
    eventTypes: string[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: s.id,
      name: s.name,
      endpointUrl: s.endpointUrl,
      eventTypes: s.eventTypes,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }
  }

  private async assertExists(tenantId: string, id: string) {
    const sub = await this.repo.findById(tenantId, id)
    if (!sub) throw new NotFoundException(`Webhook subscription ${id} not found`)
  }
}
