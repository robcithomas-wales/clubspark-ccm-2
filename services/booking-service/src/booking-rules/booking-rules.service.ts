import { Injectable, NotFoundException } from '@nestjs/common'
import { BookingRulesRepository } from './booking-rules.repository.js'
import type { BookingRuleRow } from './booking-rules.repository.js'
import type { CreateBookingRuleDto } from './dto/create-booking-rule.dto.js'
import type { UpdateBookingRuleDto } from './dto/update-booking-rule.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

export interface RuleEvaluationResult {
  allowed: boolean
  requiresApproval: boolean
  reason?: string
  appliedRule?: { id: string; name: string }
}

@Injectable()
export class BookingRulesService {
  constructor(private readonly repo: BookingRulesRepository) {}

  async list(ctx: TenantContext) {
    return this.repo.findAll(ctx.tenantId)
  }

  async getById(ctx: TenantContext, id: string) {
    const rule = await this.repo.findById(ctx.tenantId, id)
    if (!rule) throw new NotFoundException('Booking rule not found')
    return rule
  }

  async create(ctx: TenantContext, dto: CreateBookingRuleDto) {
    return this.repo.create(ctx.tenantId, dto)
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBookingRuleDto) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Booking rule not found')
    return this.repo.update(ctx.tenantId, id, dto)
  }

  async delete(ctx: TenantContext, id: string) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Booking rule not found')
    await this.repo.delete(ctx.tenantId, id)
  }

  /**
   * Loads applicable rules for a booking context and evaluates them.
   * Returns the enforcement decision — called by BookingsService before creation.
   */
  async enforceRules(
    tenantId: string,
    resourceId: string,
    resourceGroupId: string | null,
    startsAt: Date,
    endsAt: Date,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.repo.findApplicableRules(tenantId, resourceId, resourceGroupId, startsAt)
    return this.evaluate(rules, startsAt, endsAt)
  }

  /**
   * Pure evaluation — takes already-loaded rules and returns a decision.
   * Rules are expected ordered by specificity DESC, priority DESC (from findApplicableRules).
   * Only 'everyone' subject rules are evaluated here; role/membership rules require
   * subject context that will be added in a future iteration.
   */
  evaluate(rules: BookingRuleRow[], startsAt: Date, endsAt: Date): RuleEvaluationResult {
    const everyoneRules = rules.filter((r) => r.subjectType === 'everyone')
    const rule = everyoneRules[0]

    if (!rule) {
      return { allowed: true, requiresApproval: false }
    }

    if (!rule.canBook) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: 'Booking not permitted by access rule',
        appliedRule: { id: rule.id, name: rule.name },
      }
    }

    if (rule.advanceDays != null) {
      const windowEnd = new Date()
      windowEnd.setDate(windowEnd.getDate() + rule.advanceDays)
      if (startsAt > windowEnd) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Bookings must be made at most ${rule.advanceDays} days in advance`,
          appliedRule: { id: rule.id, name: rule.name },
        }
      }
    }

    const slotMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000

    if (rule.minSlotMinutes != null && slotMinutes < rule.minSlotMinutes) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Booking must be at least ${rule.minSlotMinutes} minutes`,
        appliedRule: { id: rule.id, name: rule.name },
      }
    }

    if (rule.maxSlotMinutes != null && slotMinutes > rule.maxSlotMinutes) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Booking cannot exceed ${rule.maxSlotMinutes} minutes`,
        appliedRule: { id: rule.id, name: rule.name },
      }
    }

    return {
      allowed: true,
      requiresApproval: rule.requiresApproval,
      appliedRule: { id: rule.id, name: rule.name },
    }
  }
}
