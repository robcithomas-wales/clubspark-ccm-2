import { Injectable, Logger } from '@nestjs/common'
import { PricingRepository, type PricingRuleRow } from './pricing.repository.js'
import { MembershipClient } from '../membership/membership.client.js'
import type { CreatePricingRuleDto } from './dto/create-pricing-rule.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { VenueProjectionReadsService } from '../projections/venue-projection-reads.service.js'

export interface PriceBreakdown {
  /**
   * Gross price before discounts — base rate + lighting surcharge.
   */
  gross: number
  /** Base rate line: ratePerHour × durationHours */
  baseAmount: number
  /** Lighting surcharge line: lightingSurchargePerHour × durationHours (0 if no lighting) */
  lightingSurcharge: number
  /** Discount as an absolute amount (positive number) */
  memberDiscount: number
  /** memberDiscountPct actually applied */
  memberDiscountPct: number
  /** Final price after discount */
  total: number
  currency: string
  durationHours: number
  appliedRule: { id: string; name: string; label: string | null } | null
}

export interface ResolvePriceInput {
  venueId: string
  resourceId: string
  bookableUnitId: string
  startsAt: Date
  endsAt: Date
  customerId?: string | null
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name)

  constructor(
    private readonly repo: PricingRepository,
    private readonly membershipClient: MembershipClient,
    private readonly venueProjectionReads: VenueProjectionReadsService,
  ) {}

  // ─── Pricing rule CRUD ─────────────────────────────────────────────────────

  async listRules(ctx: TenantContext) {
    return this.repo.findAll(ctx.tenantId)
  }

  async getRule(ctx: TenantContext, id: string) {
    return this.repo.findById(ctx.tenantId, id)
  }

  async createRule(ctx: TenantContext, dto: CreatePricingRuleDto) {
    return this.repo.create(ctx.tenantId, dto)
  }

  async updateRule(ctx: TenantContext, id: string, dto: Partial<CreatePricingRuleDto>) {
    return this.repo.update(ctx.tenantId, id, dto)
  }

  async deleteRule(ctx: TenantContext, id: string) {
    return this.repo.delete(ctx.tenantId, id)
  }

  // ─── Price resolution ──────────────────────────────────────────────────────

  /**
   * Resolve the price for a booking slot.
   *
   * Resolution order:
   * 1. Load all active pricing rules applicable to this scope (bookable_unit > resource > venue > org).
   * 2. Filter to rules whose day-of-week and time window match the slot start.
   * 3. Pick the highest-priority (most specific) matching rule.
   * 4. Calculate: base = ratePerHour × durationHours
   * 5. If the resource has lighting AND the rule has lightingSurchargePerHour, add it.
   * 6. Apply member discount: rule.memberDiscountPct OR membership-service value.
   *
   * Returns null if no pricing rule is configured (price must be set manually).
   */
  async resolvePrice(tenantId: string, input: ResolvePriceInput): Promise<PriceBreakdown | null> {
    const candidates = await this.repo.findApplicable(
      tenantId,
      input.venueId,
      input.resourceId,
      input.bookableUnitId,
    )

    const rule = this.selectRule(candidates, input.startsAt)
    if (!rule) return null

    const durationHours = (input.endsAt.getTime() - input.startsAt.getTime()) / 3_600_000

    // Base cost
    const baseAmount = parseFloat((rule.ratePerHour * durationHours).toFixed(2))

    // Lighting surcharge
    let lightingSurcharge = 0
    if (rule.lightingSurchargePerHour != null && rule.lightingSurchargePerHour > 0) {
      const hasLighting = await this.venueProjectionReads.getResourceLighting(
        tenantId,
        input.resourceId,
        () => this.repo.getResourceLighting(tenantId, input.resourceId),
      )
      if (hasLighting) {
        lightingSurcharge = parseFloat((rule.lightingSurchargePerHour * durationHours).toFixed(2))
      }
    }

    const gross = parseFloat((baseAmount + lightingSurcharge).toFixed(2))

    // Member discount
    let memberDiscountPct = 0
    if (input.customerId) {
      if (rule.memberDiscountPct != null) {
        // Rule overrides membership-service value
        memberDiscountPct = rule.memberDiscountPct
      } else {
        const fromService = await this.membershipClient.resolveMemberDiscount(
          tenantId,
          input.customerId,
        )
        memberDiscountPct = fromService ?? 0
      }
    }

    const memberDiscount = parseFloat(((gross * memberDiscountPct) / 100).toFixed(2))
    const total = parseFloat((gross - memberDiscount).toFixed(2))

    const breakdown: PriceBreakdown = {
      gross,
      baseAmount,
      lightingSurcharge,
      memberDiscount,
      memberDiscountPct,
      total,
      currency: rule.currency,
      durationHours,
      appliedRule: { id: rule.id, name: rule.name, label: rule.label },
    }

    this.logger.debug(
      { ...breakdown, resourceId: input.resourceId, venueId: input.venueId },
      'Price resolved',
    )

    return breakdown
  }

  /**
   * Selects the best-matching rule for the given slot start time.
   * Candidates are already ordered by specificity ASC, priority DESC from the DB query.
   * We pick the first one whose day-of-week and time window match.
   */
  private selectRule(candidates: PricingRuleRow[], startsAt: Date): PricingRuleRow | null {
    const dayOfWeek = startsAt.getDay() // 0=Sun … 6=Sat
    const timeStr = this.toHHMM(startsAt) // "HH:MM"

    for (const rule of candidates) {
      // Day-of-week filter (empty = all days)
      if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) continue

      // Time window filter (null = all hours)
      if (rule.timeFrom && timeStr < rule.timeFrom) continue
      if (rule.timeTo && timeStr >= rule.timeTo) continue

      return rule
    }
    return null
  }

  private toHHMM(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
}
