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
import type { CreateBookingDto } from './dto/create-booking.dto.js'
import type { CreateBookingAddOnDto } from './dto/create-booking-add-on.dto.js'
import type { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js'
import type { UpdateBookingDto } from './dto/update-booking.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name)

  constructor(
    private readonly repo: BookingsRepository,
    private readonly availabilityRepo: AvailabilityRepository,
    private readonly rulesService: BookingRulesService,
  ) {}

  async list(
    ctx: TenantContext,
    page: number,
    limit: number,
    filters: { status?: string; fromDate?: string; toDate?: string } = {},
  ) {
    return this.repo.list(ctx.tenantId, page, limit, filters)
  }

  async getById(ctx: TenantContext, id: string) {
    const booking = await this.repo.findById(ctx.tenantId, id)
    if (!booking) throw new NotFoundException('Booking not found')
    return booking
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

    this.logger.log(
      { organisationId: ctx.organisationId, bookableUnitId: dto.bookableUnitId },
      'Creating booking',
    )

    // Atomic insert — SERIALIZABLE transaction + exclusion constraint as safety net
    const booking = await this.repo.createAtomic(
      ctx.tenantId,
      ctx.organisationId,
      unitIds,
      dto,
    )

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
        throw new ConflictException('Booking conflicts with an existing booking for the selected time slot')
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
    return this.repo.getTopCustomers(ctx.tenantId, limit)
  }

  async cancel(ctx: TenantContext, id: string) {
    const cancelled = await this.repo.cancel(ctx.tenantId, id)

    if (cancelled) {
      this.logger.log({ id, organisationId: ctx.organisationId }, 'Booking cancelled')
      return cancelled
    }

    const exists = await this.repo.exists(ctx.tenantId, id)
    if (!exists) throw new NotFoundException('Booking not found')

    throw new ConflictException('Booking is already cancelled')
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

    this.logger.log(
      { bookingId, organisationId: ctx.organisationId },
      'Creating booking add-on',
    )
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
}
