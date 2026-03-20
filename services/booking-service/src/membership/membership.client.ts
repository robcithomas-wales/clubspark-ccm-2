import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface ActiveMembership {
  id: string
  planId: string
  status: string
}

interface PlanEntitlement {
  id: string
  entitlementPolicyId: string
  configuration: Record<string, unknown>
  priority: number
  entitlementPolicy: {
    name: string
    policyType: string | null
  }
}

@Injectable()
export class MembershipClient {
  private readonly logger = new Logger(MembershipClient.name)
  private readonly baseUrl: string

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('membershipService.url') ?? 'http://localhost:4010'
  }

  /**
   * Returns the first active membership for a customer, or null if none exists.
   */
  async getActiveMembership(tenantId: string, customerId: string): Promise<ActiveMembership | null> {
    try {
      const url = `${this.baseUrl}/memberships?customerId=${customerId}&status=active&limit=1`
      const res = await fetch(url, {
        headers: { 'x-tenant-id': tenantId },
      })
      if (!res.ok) return null
      const body = await res.json() as { data?: ActiveMembership[] }
      return body.data?.[0] ?? null
    } catch (err) {
      this.logger.warn({ customerId, err }, 'Failed to fetch active membership — skipping discount')
      return null
    }
  }

  /**
   * Returns entitlement policies linked to a plan.
   */
  async getPlanEntitlements(tenantId: string, planId: string): Promise<PlanEntitlement[]> {
    try {
      const url = `${this.baseUrl}/membership-plans/${planId}/entitlements`
      const res = await fetch(url, {
        headers: { 'x-tenant-id': tenantId },
      })
      if (!res.ok) return []
      const body = await res.json() as PlanEntitlement[] | { data?: PlanEntitlement[] }
      return Array.isArray(body) ? body : (body.data ?? [])
    } catch (err) {
      this.logger.warn({ planId, err }, 'Failed to fetch plan entitlements — skipping discount')
      return []
    }
  }

  /**
   * Resolves the member discount percentage for a customer.
   * Returns a value between 0 and 100, or null if no discount applies.
   */
  async resolveMemberDiscount(tenantId: string, customerId: string): Promise<number | null> {
    const membership = await this.getActiveMembership(tenantId, customerId)
    if (!membership) return null

    const entitlements = await this.getPlanEntitlements(tenantId, membership.planId)

    const discountEntitlement = entitlements.find(
      (e) =>
        e.entitlementPolicy.policyType === 'booking_discount' &&
        e.configuration?.discountType === 'percentage' &&
        typeof e.configuration?.discountValue === 'number',
    )

    if (!discountEntitlement) return null

    return discountEntitlement.configuration.discountValue as number
  }
}
