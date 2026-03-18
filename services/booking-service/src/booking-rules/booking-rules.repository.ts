import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { Prisma } from '../generated/prisma/index.js'
import type { CreateBookingRuleDto } from './dto/create-booking-rule.dto.js'
import type { UpdateBookingRuleDto } from './dto/update-booking-rule.dto.js'

export interface BookingRuleRow {
  id: string
  tenantId: string
  name: string
  subjectType: string
  subjectRef: string | null
  scopeType: string
  scopeId: string | null
  daysOfWeek: number[]
  timeFrom: Date | null
  timeTo: Date | null
  canBook: boolean
  requiresApproval: boolean
  advanceDays: number | null
  minSlotMinutes: number | null
  maxSlotMinutes: number | null
  allowSeries: boolean
  priority: number
  isActive: boolean
}

@Injectable()
export class BookingRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.read.bookingRule.findMany({
      where: { tenantId },
      include: { purposePrices: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.read.bookingRule.findFirst({
      where: { tenantId, id },
      include: { purposePrices: true },
    })
  }

  async create(tenantId: string, dto: CreateBookingRuleDto) {
    const { purposePrices, ...rest } = dto
    return this.prisma.write.bookingRule.create({
      data: {
        tenantId,
        name: rest.name,
        description: rest.description ?? null,
        subjectType: rest.subjectType,
        subjectRef: rest.subjectRef ?? null,
        scopeType: rest.scopeType,
        scopeId: rest.scopeId ?? null,
        daysOfWeek: rest.daysOfWeek ?? [],
        timeFrom: rest.timeFrom ?? null,
        timeTo: rest.timeTo ?? null,
        canBook: rest.canBook,
        requiresApproval: rest.requiresApproval,
        advanceDays: rest.advanceDays ?? null,
        minSlotMinutes: rest.minSlotMinutes ?? null,
        maxSlotMinutes: rest.maxSlotMinutes ?? null,
        bookingPeriodDays: rest.bookingPeriodDays ?? null,
        maxBookingsPerPeriod: rest.maxBookingsPerPeriod ?? null,
        allowSeries: rest.allowSeries,
        pricePerSlot: rest.pricePerSlot != null ? rest.pricePerSlot : null,
        priceCurrency: rest.priceCurrency ?? 'GBP',
        minParticipants: rest.minParticipants ?? null,
        maxParticipants: rest.maxParticipants ?? null,
        priority: rest.priority,
        isActive: rest.isActive,
        purposePrices: purposePrices?.length
          ? {
              create: purposePrices.map((p) => ({
                purpose: p.purpose,
                price: p.price,
                currency: p.currency,
              })),
            }
          : undefined,
      },
      include: { purposePrices: true },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateBookingRuleDto) {
    const { purposePrices, ...rest } = dto

    return this.prisma.write.$transaction(async (tx) => {
      if (purposePrices !== undefined) {
        await tx.bookingRulePurposePrice.deleteMany({ where: { ruleId: id } })
      }

      return tx.bookingRule.update({
        where: { id },
        data: {
          ...(rest.name !== undefined && { name: rest.name }),
          ...(rest.description !== undefined && { description: rest.description }),
          ...(rest.subjectType !== undefined && { subjectType: rest.subjectType }),
          ...(rest.subjectRef !== undefined && { subjectRef: rest.subjectRef }),
          ...(rest.scopeType !== undefined && { scopeType: rest.scopeType }),
          ...(rest.scopeId !== undefined && { scopeId: rest.scopeId }),
          ...(rest.daysOfWeek !== undefined && { daysOfWeek: rest.daysOfWeek }),
          ...(rest.timeFrom !== undefined && { timeFrom: rest.timeFrom }),
          ...(rest.timeTo !== undefined && { timeTo: rest.timeTo }),
          ...(rest.canBook !== undefined && { canBook: rest.canBook }),
          ...(rest.requiresApproval !== undefined && { requiresApproval: rest.requiresApproval }),
          ...(rest.advanceDays !== undefined && { advanceDays: rest.advanceDays }),
          ...(rest.minSlotMinutes !== undefined && { minSlotMinutes: rest.minSlotMinutes }),
          ...(rest.maxSlotMinutes !== undefined && { maxSlotMinutes: rest.maxSlotMinutes }),
          ...(rest.bookingPeriodDays !== undefined && { bookingPeriodDays: rest.bookingPeriodDays }),
          ...(rest.maxBookingsPerPeriod !== undefined && {
            maxBookingsPerPeriod: rest.maxBookingsPerPeriod,
          }),
          ...(rest.allowSeries !== undefined && { allowSeries: rest.allowSeries }),
          ...(rest.pricePerSlot !== undefined && { pricePerSlot: rest.pricePerSlot }),
          ...(rest.priceCurrency !== undefined && { priceCurrency: rest.priceCurrency }),
          ...(rest.minParticipants !== undefined && { minParticipants: rest.minParticipants }),
          ...(rest.maxParticipants !== undefined && { maxParticipants: rest.maxParticipants }),
          ...(rest.priority !== undefined && { priority: rest.priority }),
          ...(rest.isActive !== undefined && { isActive: rest.isActive }),
          ...(purposePrices !== undefined && purposePrices.length > 0
            ? {
                purposePrices: {
                  create: purposePrices.map((p) => ({
                    purpose: p.purpose,
                    price: p.price,
                    currency: p.currency,
                  })),
                },
              }
            : {}),
        },
        include: { purposePrices: true },
      })
    })
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.write.bookingRule.delete({ where: { id } })
  }

  /**
   * Returns active rules that match the given resource's scope hierarchy
   * and the booking's day-of-week / time window, ordered by specificity then priority.
   *
   * Scope precedence: resource > resource_group > organisation
   * Day convention: 0 = Monday … 6 = Sunday  (ISO DOW - 1)
   */
  async findApplicableRules(
    tenantId: string,
    resourceId: string,
    resourceGroupId: string | null,
    startsAt: Date,
  ): Promise<BookingRuleRow[]> {
    const groupIdFilter = resourceGroupId
      ? Prisma.sql`OR (scope_type = 'resource_group' AND scope_id = ${resourceGroupId}::uuid)`
      : Prisma.empty

    return this.prisma.read.$queryRaw<BookingRuleRow[]>(
      Prisma.sql`
        SELECT
          id,
          tenant_id         AS "tenantId",
          name,
          subject_type      AS "subjectType",
          subject_ref       AS "subjectRef",
          scope_type        AS "scopeType",
          scope_id          AS "scopeId",
          days_of_week      AS "daysOfWeek",
          time_from         AS "timeFrom",
          time_to           AS "timeTo",
          can_book          AS "canBook",
          requires_approval AS "requiresApproval",
          advance_days      AS "advanceDays",
          min_slot_minutes  AS "minSlotMinutes",
          max_slot_minutes  AS "maxSlotMinutes",
          allow_series      AS "allowSeries",
          priority,
          is_active         AS "isActive"
        FROM booking.booking_rules
        WHERE tenant_id = ${tenantId}::uuid
          AND is_active = true
          AND (
            scope_type = 'organisation'
            ${groupIdFilter}
            OR (scope_type = 'resource' AND scope_id = ${resourceId}::uuid)
          )
          AND (
            days_of_week IS NULL
            OR array_length(days_of_week, 1) IS NULL
            OR ((EXTRACT(ISODOW FROM ${startsAt}::timestamptz) - 1)::smallint) = ANY(days_of_week)
          )
          AND (
            time_from IS NULL
            OR time_to IS NULL
            OR ${startsAt}::timestamptz::time BETWEEN time_from AND time_to
          )
        ORDER BY
          CASE scope_type
            WHEN 'resource'       THEN 3
            WHEN 'resource_group' THEN 2
            ELSE                       1
          END DESC,
          priority DESC
      `,
    )
  }
}
