import { Injectable, NotFoundException } from '@nestjs/common'
import { SubscriptionsRepository } from './subscriptions.repository.js'
import type { AssignPlanDto } from './dto/assign-plan.dto.js'
import type { UpdateSubscriptionDto } from './dto/update-subscription.dto.js'

@Injectable()
export class SubscriptionsService {
  constructor(private readonly repo: SubscriptionsRepository) {}

  async getByOrg(organisationId: string) {
    const sub = await this.repo.findByOrg(organisationId)
    if (!sub) throw new NotFoundException(`No subscription found for org '${organisationId}'`)
    return { data: sub }
  }

  async listByTenant(tenantId: string) {
    const subs = await this.repo.listByTenant(tenantId)
    return { data: subs }
  }

  /** Assign (or reassign) a plan to an org. Idempotent — safe to call repeatedly. */
  async assign(tenantId: string, dto: AssignPlanDto) {
    const sub = await this.repo.upsert(tenantId, dto)
    return { data: sub }
  }

  async update(organisationId: string, tenantId: string, dto: UpdateSubscriptionDto) {
    const existing = await this.repo.findByOrg(organisationId)
    if (!existing) throw new NotFoundException(`No subscription found for org '${organisationId}'`)
    await this.repo.update(organisationId, tenantId, dto)
    const updated = await this.repo.findByOrg(organisationId)
    return { data: updated }
  }
}
