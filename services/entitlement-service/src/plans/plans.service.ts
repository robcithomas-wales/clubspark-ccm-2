import { Injectable, NotFoundException } from '@nestjs/common'
import { PlansRepository } from './plans.repository.js'

@Injectable()
export class PlansService {
  constructor(private readonly repo: PlansRepository) {}

  async findAll() {
    const plans = await this.repo.findAll()
    return { data: plans.map(this.format) }
  }

  async findById(id: string) {
    const plan = await this.repo.findById(id)
    if (!plan) throw new NotFoundException(`Plan '${id}' not found`)
    return { data: this.format(plan) }
  }

  private format(plan: NonNullable<Awaited<ReturnType<PlansRepository['findById']>>>) {
    return {
      id: plan.id,
      name: plan.name,
      priceMonthly: plan.priceMonthly ? Number(plan.priceMonthly) : null,
      priceAnnually: plan.priceAnnually ? Number(plan.priceAnnually) : null,
      transactionFeePercent: plan.transactionFeePercent ? Number(plan.transactionFeePercent) : null,
      includedSites: plan.includedSites,
      isCustom: plan.isCustom,
      features: plan.planFeatures.map((pf) => ({
        id: pf.feature.id,
        name: pf.feature.name,
        description: pf.feature.description,
      })),
    }
  }
}
