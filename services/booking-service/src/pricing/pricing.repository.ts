import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { Prisma } from '../generated/prisma/index.js'
import type { CreatePricingRuleDto } from './dto/create-pricing-rule.dto.js'

export interface PricingRuleRow {
  id: string
  tenantId: string
  name: string
  label: string | null
  description: string | null
  scopeType: string
  scopeId: string | null
  daysOfWeek: number[]
  timeFrom: string | null
  timeTo: string | null
  ratePerHour: number
  currency: string
  lightingSurchargePerHour: number | null
  memberDiscountPct: number | null
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class PricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string): Promise<PricingRuleRow[]> {
    const rows = await this.prisma.write.$queryRaw<PricingRuleRow[]>`
      SELECT
        id, tenant_id AS "tenantId", name, label, description,
        scope_type AS "scopeType", scope_id AS "scopeId",
        days_of_week AS "daysOfWeek",
        time_from AS "timeFrom", time_to AS "timeTo",
        rate_per_hour::float AS "ratePerHour",
        currency,
        lighting_surcharge_per_hour::float AS "lightingSurchargePerHour",
        member_discount_pct::float AS "memberDiscountPct",
        priority, is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM booking.pricing_rules
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY priority DESC, created_at ASC
    `
    return rows
  }

  async findById(tenantId: string, id: string): Promise<PricingRuleRow | null> {
    const rows = await this.prisma.write.$queryRaw<PricingRuleRow[]>`
      SELECT
        id, tenant_id AS "tenantId", name, label, description,
        scope_type AS "scopeType", scope_id AS "scopeId",
        days_of_week AS "daysOfWeek",
        time_from AS "timeFrom", time_to AS "timeTo",
        rate_per_hour::float AS "ratePerHour",
        currency,
        lighting_surcharge_per_hour::float AS "lightingSurchargePerHour",
        member_discount_pct::float AS "memberDiscountPct",
        priority, is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM booking.pricing_rules
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
    `
    return rows[0] ?? null
  }

  /**
   * Find all active rules that could apply to this booking context.
   * Returns them ordered by specificity (more specific scope first) then priority DESC.
   * The caller picks the first matching rule after time/day filtering.
   */
  async findApplicable(
    tenantId: string,
    venueId: string,
    resourceId: string,
    bookableUnitId: string,
  ): Promise<PricingRuleRow[]> {
    const rows = await this.prisma.read.$queryRaw<PricingRuleRow[]>`
      SELECT
        id, tenant_id AS "tenantId", name, label, description,
        scope_type AS "scopeType", scope_id AS "scopeId",
        days_of_week AS "daysOfWeek",
        time_from AS "timeFrom", time_to AS "timeTo",
        rate_per_hour::float AS "ratePerHour",
        currency,
        lighting_surcharge_per_hour::float AS "lightingSurchargePerHour",
        member_discount_pct::float AS "memberDiscountPct",
        priority, is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM booking.pricing_rules
      WHERE tenant_id = ${tenantId}::uuid
        AND is_active = true
        AND (
          (scope_type = 'organisation')
          OR (scope_type = 'venue'          AND scope_id = ${venueId}::uuid)
          OR (scope_type = 'resource'       AND scope_id = ${resourceId}::uuid)
          OR (scope_type = 'bookable_unit'  AND scope_id = ${bookableUnitId}::uuid)
        )
      ORDER BY
        CASE scope_type
          WHEN 'bookable_unit'  THEN 1
          WHEN 'resource'       THEN 2
          WHEN 'resource_group' THEN 3
          WHEN 'venue'          THEN 4
          WHEN 'organisation'   THEN 5
        END ASC,
        priority DESC
    `
    return rows
  }

  /** Read hasLighting from the venue schema resource row */
  async getResourceLighting(resourceId: string): Promise<boolean> {
    const rows = await this.prisma.read.$queryRaw<{ hasLighting: boolean | null }[]>`
      SELECT has_lighting AS "hasLighting"
      FROM venue.resources
      WHERE id = ${resourceId}::uuid
    `
    return rows[0]?.hasLighting === true
  }

  async create(tenantId: string, dto: CreatePricingRuleDto): Promise<PricingRuleRow | undefined> {
    const rows = await this.prisma.write.$queryRaw<PricingRuleRow[]>`
      INSERT INTO booking.pricing_rules (
        tenant_id, name, label, description,
        scope_type, scope_id,
        days_of_week, time_from, time_to,
        rate_per_hour, currency,
        lighting_surcharge_per_hour, member_discount_pct,
        priority, is_active
      ) VALUES (
        ${tenantId}::uuid,
        ${dto.name},
        ${dto.label ?? null},
        ${dto.description ?? null},
        ${dto.scopeType},
        ${dto.scopeId ? Prisma.sql`${dto.scopeId}::uuid` : Prisma.sql`NULL`},
        ${dto.daysOfWeek ?? []}::integer[],
        ${dto.timeFrom ?? null},
        ${dto.timeTo ?? null},
        ${dto.ratePerHour},
        ${dto.currency ?? 'GBP'},
        ${dto.lightingSurchargePerHour ?? null},
        ${dto.memberDiscountPct ?? null},
        ${dto.priority ?? 0},
        ${dto.isActive ?? true}
      )
      RETURNING
        id, tenant_id AS "tenantId", name, label, description,
        scope_type AS "scopeType", scope_id AS "scopeId",
        days_of_week AS "daysOfWeek",
        time_from AS "timeFrom", time_to AS "timeTo",
        rate_per_hour::float AS "ratePerHour",
        currency,
        lighting_surcharge_per_hour::float AS "lightingSurchargePerHour",
        member_discount_pct::float AS "memberDiscountPct",
        priority, is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    return rows[0]
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePricingRuleDto>): Promise<PricingRuleRow | null> {
    const sets: Prisma.Sql[] = []

    if (dto.name !== undefined)        sets.push(Prisma.sql`name = ${dto.name}`)
    if (dto.label !== undefined)       sets.push(Prisma.sql`label = ${dto.label ?? null}`)
    if (dto.description !== undefined) sets.push(Prisma.sql`description = ${dto.description ?? null}`)
    if (dto.scopeType !== undefined)   sets.push(Prisma.sql`scope_type = ${dto.scopeType}`)
    if (dto.scopeId !== undefined)     sets.push(dto.scopeId ? Prisma.sql`scope_id = ${dto.scopeId}::uuid` : Prisma.sql`scope_id = NULL`)
    if (dto.daysOfWeek !== undefined)  sets.push(Prisma.sql`days_of_week = ${dto.daysOfWeek}::integer[]`)
    if (dto.timeFrom !== undefined)    sets.push(Prisma.sql`time_from = ${dto.timeFrom ?? null}`)
    if (dto.timeTo !== undefined)      sets.push(Prisma.sql`time_to = ${dto.timeTo ?? null}`)
    if (dto.ratePerHour !== undefined) sets.push(Prisma.sql`rate_per_hour = ${dto.ratePerHour}`)
    if (dto.currency !== undefined)    sets.push(Prisma.sql`currency = ${dto.currency}`)
    if (dto.lightingSurchargePerHour !== undefined)
      sets.push(Prisma.sql`lighting_surcharge_per_hour = ${dto.lightingSurchargePerHour ?? null}`)
    if (dto.memberDiscountPct !== undefined)
      sets.push(Prisma.sql`member_discount_pct = ${dto.memberDiscountPct ?? null}`)
    if (dto.priority !== undefined)    sets.push(Prisma.sql`priority = ${dto.priority}`)
    if (dto.isActive !== undefined)    sets.push(Prisma.sql`is_active = ${dto.isActive}`)

    if (sets.length === 0) return this.findById(tenantId, id)

    const setSql = Prisma.join(sets, ', ')
    const rows = await this.prisma.write.$queryRaw<PricingRuleRow[]>`
      UPDATE booking.pricing_rules
      SET ${setSql}, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      RETURNING
        id, tenant_id AS "tenantId", name, label, description,
        scope_type AS "scopeType", scope_id AS "scopeId",
        days_of_week AS "daysOfWeek",
        time_from AS "timeFrom", time_to AS "timeTo",
        rate_per_hour::float AS "ratePerHour",
        currency,
        lighting_surcharge_per_hour::float AS "lightingSurchargePerHour",
        member_discount_pct::float AS "memberDiscountPct",
        priority, is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.write.$executeRaw`
      DELETE FROM booking.pricing_rules
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
    `
  }
}
