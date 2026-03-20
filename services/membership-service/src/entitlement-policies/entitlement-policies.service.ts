import { Injectable, NotFoundException } from '@nestjs/common'
import { EntitlementPoliciesRepository } from './entitlement-policies.repository'
import { CreateEntitlementPolicyDto } from './dto/create-entitlement-policy.dto'
import { ReplacePlanEntitlementsDto } from './dto/replace-plan-entitlements.dto'

@Injectable()
export class EntitlementPoliciesService {
  constructor(private readonly repo: EntitlementPoliciesRepository) {}

  async list(
    tenantId: string,
    organisationId: string,
    query: { limit?: number; offset?: number },
  ) {
    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = Number(query.offset) || 0

    const { rows, total } = await this.repo.list({ tenantId, organisationId, limit, offset })
    return { data: rows, pagination: { total, limit, offset } }
  }

  async getById(tenantId: string, organisationId: string, id: string) {
    const policy = await this.repo.findById(tenantId, organisationId, id)
    if (!policy) throw new NotFoundException('Entitlement policy not found')
    return { data: policy }
  }

  async create(tenantId: string, organisationId: string, dto: CreateEntitlementPolicyDto) {
    const policy = await this.repo.create({
      tenantId,
      organisationId,
      name: dto.name,
      policyType: dto.policyType ?? null,
      description: dto.description ?? null,
      status: dto.status ?? 'active',
    })
    return { data: policy }
  }

  async update(
    tenantId: string,
    organisationId: string,
    id: string,
    dto: { name?: string; policyType?: string | null; description?: string | null; status?: string },
  ) {
    const existing = await this.repo.findById(tenantId, organisationId, id)
    if (!existing) throw new NotFoundException('Entitlement policy not found')
    const policy = await this.repo.update(id, dto)
    return { data: policy }
  }

  async getPlanEntitlements(tenantId: string, organisationId: string, planId: string) {
    const entitlements = await this.repo.listByPlanId(tenantId, organisationId, planId)
    const data = entitlements.map((e: any) => ({
      id: e.id,
      planId: e.planId,
      entitlementPolicyId: e.entitlementPolicyId,
      policyName: e.entitlementPolicy?.name ?? null,
      policyType: e.entitlementPolicy?.policyType ?? null,
      scopeType: e.scopeType,
      scopeId: e.scopeId,
      configuration: e.configuration,
      priority: e.priority,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }))
    return { data }
  }

  async replacePlanEntitlements(
    tenantId: string,
    organisationId: string,
    planId: string,
    dto: ReplacePlanEntitlementsDto,
  ) {
    await this.repo.replaceForPlan(tenantId, planId, dto.entitlements)
    return this.getPlanEntitlements(tenantId, organisationId, planId)
  }
}
