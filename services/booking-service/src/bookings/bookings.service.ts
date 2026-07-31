import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { BookingsRepository } from './bookings.repository.js'
import { AvailabilityRepository } from '../availability/availability.repository.js'
import { BookingRulesService } from '../booking-rules/booking-rules.service.js'
import { MembershipClient } from '../membership/membership.client.js'
import { PricingService } from '../pricing/pricing.service.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import { RefundPoliciesRepository } from '../refund-policies/refund-policies.repository.js'
import { OrderClient } from '../order-client/order.client.js'
import { PeopleClient } from '../people/people.client.js'
import { OutboxRepository } from '../outbox/outbox.repository.js'
import type { CreateBookingDto } from './dto/create-booking.dto.js'
import type { CreateBookingAddOnDto } from './dto/create-booking-add-on.dto.js'
import type { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js'
import type { UpdateBookingDto } from './dto/update-booking.dto.js'
import type { CreatePaymentSplitDto } from './dto/create-payment-split.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name)

  constructor(
    private readonly repo: BookingsRepository,
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly rulesService: BookingRulesService,
    private readonly membershipClient: MembershipClient,
    private readonly pricingService: PricingService,
    private readonly eventBus: EventBusService,
    private readonly refundPolicies: RefundPoliciesRepository,
    private readonly orderClient: OrderClient,
    private readonly people: PeopleClient,
    private readonly outbox: OutboxRepository,
  ) {}

  async list(
    ctx: TenantContext,
    page: number,
    limit: number,
    filters: { status?: string; fromDate?: string; toDate?: string; customerId?: string } = {},
  ) {
    const result = await this.repo.list(ctx.tenantId, page, limit, filters)
    // Customer names come from people-service, not a SQL join — see PeopleClient.
    return { ...result, rows: await this.people.hydrate(ctx.tenantId, result.rows) }
  }

  async getById(ctx: TenantContext, id: string) {
    const booking = await this.repo.findById(ctx.tenantId, id)
    if (!booking) throw new NotFoundException('Booking not found')
    const [hydrated] = await this.people.hydrate(ctx.tenantId, [booking])
    return hydrated ?? booking
  }

  async create(ctx: TenantContext, dto: CreateBookingDto) {
    // Validate the bookable unit exists and belongs to the correct venue/resource
    const unit = await this.repo.findBookableUnit(ctx.tenantId, dto.bookableUnitId)

    if (!unit) throw new NotFoundException('Bookable unit not found')
    if (!unit.isActive) throw new ConflictException('Bookable unit is inactive')
    if (unit.venueId !== dto.venueId)
      throw new BadRequestException('Bookable unit does not belong to the specified venue')
    if (unit.resourceId !== dto.resourceId)
      throw new BadRequestException('Bookable unit does not belong to the specified resource')

    // Enforce booking rules — admin bookings bypass (CPO decision)
    if (dto.bookingSource !== 'admin') {
      const resourceGroupId = await this.repo.findResourceGroupId(dto.resourceId)
      const decision = await this.rulesService.enforceRules(
        ctx.tenantId,
        dto.resourceId,
        resourceGroupId,
        new Date(dto.startsAt),
        new Date(dto.endsAt),
      )
      if (!decision.allowed) {
        throw new ForbiddenException(decision.reason ?? 'Booking not permitted by access rule')
      }
    }

    // Batch-load all conflicting unit IDs in a single query (fixes the N+1)
    const conflictMap = await this.availabilityRepo.getConflictMapForUnits([dto.bookableUnitId])
    const unitIds = conflictMap.get(dto.bookableUnitId) ?? [dto.bookableUnitId]

    // Gap 1 fix: coaching sessions with a bookable_unit_id block the same slot.
    // This cross-schema check makes coaching sessions visible to the booking
    // availability guard without requiring inter-service HTTP calls.
    const coachingConflicts = await this.availabilityRepo.getCoachingSessionConflicts(
      ctx.tenantId,
      unitIds,
      dto.startsAt,
      dto.endsAt,
    )
    if (coachingConflicts.length > 0) {
      throw new ConflictException('Time slot is occupied by an existing coaching session')
    }

    // Resolve price via pricing engine.
    // If dto.price is explicitly provided by the caller (e.g. admin override), use it as-is
    // but still apply member discount. If no price is provided, resolve from pricing rules.
    let resolvedDto = dto
    const priceBreakdown = await this.pricingService.resolvePrice(ctx.tenantId, {
      venueId: dto.venueId,
      resourceId: dto.resourceId,
      bookableUnitId: dto.bookableUnitId,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      customerId: dto.customerId,
    })

    if (priceBreakdown) {
      // Pricing rule found — use the resolved total (includes lighting surcharge + member discount)
      resolvedDto = { ...dto, price: priceBreakdown.total }
      this.logger.log(
        {
          rule: priceBreakdown.appliedRule?.name,
          gross: priceBreakdown.gross,
          lightingSurcharge: priceBreakdown.lightingSurcharge,
          memberDiscount: priceBreakdown.memberDiscount,
          total: priceBreakdown.total,
        },
        'Pricing engine resolved price',
      )
    } else if (dto.customerId && dto.price != null) {
      // No pricing rule — fall back to applying member discount against the provided price
      const discountPct = await this.membershipClient.resolveMemberDiscount(
        ctx.tenantId,
        dto.customerId,
      )
      if (discountPct != null && discountPct > 0) {
        const discountedPrice = parseFloat((dto.price * (1 - discountPct / 100)).toFixed(2))
        resolvedDto = { ...dto, price: discountedPrice }
        this.logger.log(
          {
            customerId: dto.customerId,
            discountPct,
            original: dto.price,
            discounted: discountedPrice,
          },
          'Member discount applied (no pricing rule — fallback)',
        )
      }
    }

    this.logger.log(
      { organisationId: ctx.organisationId, bookableUnitId: dto.bookableUnitId },
      'Creating booking',
    )

    // Atomic insert — SERIALIZABLE transaction + exclusion constraint as safety net
    const booking = await this.repo.createAtomic(
      ctx.tenantId,
      ctx.organisationId,
      unitIds,
      resolvedDto,
      // Recorded in the SAME transaction as the insert (MR-2). The relay delivers
      // it; if this transaction rolls back, no event is emitted for a booking
      // that never existed.
      async (tx, created) => {
        await this.outbox.enqueue(tx, {
          type: 'booking.confirmed',
          tenantId: ctx.tenantId,
          occurredAt: new Date().toISOString(),
          bookingId: created.id,
          bookingReference: created.bookingReference,
          bookerPersonId: created.customerId ?? '',
          bookerEmail: (resolvedDto as { bookerEmail?: string }).bookerEmail ?? '',
          bookerFirstName: (resolvedDto as { bookerFirstName?: string }).bookerFirstName ?? '',
          venueId: created.venueId,
          venueName: (resolvedDto as { venueName?: string }).venueName ?? '',
          resourceName: (resolvedDto as { resourceName?: string }).resourceName ?? '',
          bookableUnitName: (resolvedDto as { bookableUnitName?: string }).bookableUnitName ?? '',
          startsAt: created.startsAt,
          endsAt: created.endsAt,
        } as never)
      },
    )

    // Create order record in the shared commerce layer
    if (booking) {
      const pricePence = booking.price != null ? Math.round(Number(booking.price) * 100) : 0
      void this.orderClient.createOrder({
        tenantId: ctx.tenantId,
        organisationId: ctx.organisationId,
        personId: booking.customerId ?? undefined,
        subjectType: 'booking',
        subjectId: booking.id,
        idempotencyKey: `booking:${booking.id}`,
        currency: booking.currency,
        items: [
          {
            productType: 'booking_slot',
            description: `Booking ${booking.bookingReference}`,
            unitAmount: pricePence,
          },
        ],
      })
    }

    // booking.confirmed is recorded in the outbox inside createAtomic's
    // transaction (MR-2) and delivered by OutboxRelay — no fire-and-forget publish
    // here any more.

    return booking
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBookingDto) {
    if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt')
    }

    let newUnit: { resourceId: string; venueId: string } | undefined
    if (dto.bookableUnitId) {
      const unit = await this.repo.findBookableUnit(ctx.tenantId, dto.bookableUnitId)
      if (!unit) throw new NotFoundException('Bookable unit not found')
      if (!unit.isActive) throw new ConflictException('Bookable unit is inactive')
      newUnit = { resourceId: unit.resourceId, venueId: unit.venueId }
    }

    let booking: Awaited<ReturnType<typeof this.repo.update>>
    try {
      booking = await this.repo.update(ctx.tenantId, id, dto, newUnit)
    } catch (err) {
      if (err instanceof ConflictException) throw err
      const pg = err as { code?: string }
      if (pg.code === '23P01' || pg.code === '40001') {
        throw new ConflictException(
          'Booking conflicts with an existing booking for the selected time slot',
        )
      }
      throw err
    }

    if (!booking) {
      const exists = await this.repo.exists(ctx.tenantId, id)
      if (!exists) throw new NotFoundException('Booking not found')
      throw new ConflictException('Cannot edit a cancelled booking')
    }
    this.logger.log({ id, organisationId: ctx.organisationId }, 'Booking updated')
    return booking
  }

  async getStats(ctx: TenantContext) {
    return this.repo.getStats(ctx.tenantId)
  }

  async getDailyStats(ctx: TenantContext, days: number) {
    return this.repo.getDailyStats(ctx.tenantId, days)
  }

  async getStatsSummary(ctx: TenantContext) {
    return this.repo.getStatsSummary(ctx.tenantId)
  }

  async getStatsByUnit(ctx: TenantContext) {
    return this.repo.getStatsByUnit(ctx.tenantId)
  }

  async getStatsByDow(ctx: TenantContext) {
    return this.repo.getStatsByDow(ctx.tenantId)
  }

  async getTopCustomers(ctx: TenantContext, limit: number) {
    const rows = await this.repo.getTopCustomers(ctx.tenantId, limit)
    // The aggregate is computed in SQL; names are attached afterwards so the
    // report no longer needs to JOIN people.persons.
    const people = await this.people.getDisplayFields(
      ctx.tenantId,
      rows.map((r) => r.customerId),
    )
    return rows.map((r) => {
      const p = r.customerId ? people.get(r.customerId) : undefined
      return {
        ...r,
        firstName: p?.customerFirstName ?? null,
        lastName: p?.customerLastName ?? null,
        email: p?.customerEmail ?? null,
      }
    })
  }

  async cancel(ctx: TenantContext, id: string) {
    const cancelled = await this.repo.cancel(ctx.tenantId, id, async (tx, row) => {
      // Same transaction as the cancellation (MR-2).
      await this.outbox.enqueue(tx, {
        type: 'booking.cancelled',
        tenantId: ctx.tenantId,
        occurredAt: new Date().toISOString(),
        bookingId: row.id,
        bookingReference: row.bookingReference,
        bookerPersonId: row.customerId ?? '',
        bookerEmail: '',
        bookerFirstName: '',
        venueName: '',
        resourceName: '',
        startsAt: row.startsAt.toISOString(),
      } as never)
    })

    if (cancelled) {
      this.logger.log({ id, organisationId: ctx.organisationId }, 'Booking cancelled')

      // Apply refund policy if one exists for this venue/notice period
      const hoursUntilStart =
        (new Date(cancelled.startsAt).getTime() - Date.now()) / (1000 * 60 * 60)
      const policy = await this.refundPolicies.findApplicablePolicy(
        ctx.tenantId,
        cancelled.venueId,
        Math.max(0, hoursUntilStart),
      )
      if (policy) {
        const pricePence = cancelled.price != null ? Number(cancelled.price) : null
        const refundAmount =
          pricePence != null ? Number(((pricePence * policy.refundPct) / 100).toFixed(2)) : null
        void this.refundPolicies.applyRefundToBooking(
          ctx.tenantId,
          cancelled.id,
          Number(policy.refundPct),
          refundAmount,
        )
        this.logger.log(
          { bookingId: id, refundPct: policy.refundPct, refundAmount },
          'Auto-refund computed from policy',
        )
      }

      // booking.cancelled is recorded in the outbox inside the cancel transaction.

      return cancelled
    }

    const exists = await this.repo.exists(ctx.tenantId, id)
    if (!exists) throw new NotFoundException('Booking not found')

    throw new ConflictException('Booking is already cancelled')
  }

  async bulkCancel(ctx: TenantContext, ids: string[]) {
    const cancelled = await this.repo.bulkCancel(ctx.tenantId, ids)
    this.logger.log({ count: cancelled, organisationId: ctx.organisationId }, 'Bulk cancel')
    return { cancelled }
  }

  async approve(ctx: TenantContext, id: string, approvedBy: string) {
    const booking = await this.repo.approve(ctx.tenantId, id, approvedBy)
    if (!booking) {
      const exists = await this.repo.exists(ctx.tenantId, id)
      if (!exists) throw new NotFoundException('Booking not found')
      throw new ConflictException('Booking is not in pending status')
    }
    this.logger.log({ id, approvedBy }, 'Booking approved')
    return booking
  }

  async reject(ctx: TenantContext, id: string, reason?: string) {
    const booking = await this.repo.reject(ctx.tenantId, id, reason)
    if (!booking) {
      const exists = await this.repo.exists(ctx.tenantId, id)
      if (!exists) throw new NotFoundException('Booking not found')
      throw new ConflictException('Booking is not in pending status')
    }
    this.logger.log({ id }, 'Booking rejected')
    return booking
  }

  async listAddOns(ctx: TenantContext, bookingId: string) {
    const exists = await this.repo.exists(ctx.tenantId, bookingId)
    if (!exists) throw new NotFoundException('Booking not found')
    return this.repo.listAddOns(bookingId)
  }

  async createAddOn(ctx: TenantContext, bookingId: string, dto: CreateBookingAddOnDto) {
    const exists = await this.repo.exists(ctx.tenantId, bookingId)
    if (!exists) throw new NotFoundException('Booking not found')

    this.logger.log({ bookingId, organisationId: ctx.organisationId }, 'Creating booking add-on')
    return this.repo.createAddOn(bookingId, dto)
  }

  async updatePaymentStatus(ctx: TenantContext, id: string, dto: UpdatePaymentStatusDto) {
    const booking = await this.repo.updatePaymentStatus(ctx.tenantId, id, dto.paymentStatus)

    if (!booking) {
      const exists = await this.repo.exists(ctx.tenantId, id)
      if (!exists) throw new NotFoundException('Booking not found')
      throw new ConflictException('Cannot update payment status on a cancelled booking')
    }

    this.logger.log(
      { id, paymentStatus: dto.paymentStatus, organisationId: ctx.organisationId },
      'Booking payment status updated',
    )
    return booking
  }

  async getUnitBusyTimes(tenantId: string, unitIds: string[], date: string) {
    return this.repo.getUnitBusyTimes(tenantId, unitIds, date)
  }

  // ─── Participants ────────────────────────────────────────────────────────────

  async listParticipants(ctx: TenantContext, bookingId: string) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    return this.repo.listParticipants(ctx.tenantId, bookingId)
  }

  async addParticipant(
    ctx: TenantContext,
    bookingId: string,
    dto: { name: string; email?: string; phone?: string; personId?: string; notes?: string },
  ) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot add participants to a cancelled booking')
    }
    return this.repo.addParticipant(ctx.tenantId, bookingId, dto)
  }

  async removeParticipant(ctx: TenantContext, bookingId: string, participantId: string) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    const deleted = await this.repo.removeParticipant(ctx.tenantId, bookingId, participantId)
    if (!deleted) throw new NotFoundException('Participant not found')
  }

  // ─── Payment splits ──────────────────────────────────────────────────────────

  async listPaymentSplits(ctx: TenantContext, bookingId: string) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    return this.repo.listPaymentSplits(ctx.tenantId, bookingId)
  }

  async addPaymentSplit(ctx: TenantContext, bookingId: string, dto: CreatePaymentSplitDto) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    return this.repo.addPaymentSplit(ctx.tenantId, bookingId, dto)
  }

  async removePaymentSplit(ctx: TenantContext, bookingId: string, splitId: string) {
    const booking = await this.repo.findById(ctx.tenantId, bookingId)
    if (!booking) throw new NotFoundException('Booking not found')
    const deleted = await this.repo.removePaymentSplit(ctx.tenantId, bookingId, splitId)
    if (!deleted) throw new NotFoundException('Payment split not found')
  }

  // ─── Internal (service-to-service) ───────────────────────────────────────────

  /**
   * Re-points this tenant's bookings from one customer id to another.
   *
   * Takes a bare tenantId rather than a TenantContext: the caller is another
   * service authenticated by the internal secret, so there is no JWT-derived
   * context — see the controller for why.
   */
  async reassignCustomer(tenantId: string, fromCustomerId: string, toCustomerId: string) {
    const updated = await this.repo.reassignCustomer(tenantId, fromCustomerId, toCustomerId)
    return { updated }
  }
}
