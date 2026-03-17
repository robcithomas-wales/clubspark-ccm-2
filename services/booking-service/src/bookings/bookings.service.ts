import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import { BookingsRepository } from './bookings.repository.js'
import { AvailabilityRepository } from '../availability/availability.repository.js'
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
    const booking = await this.repo.update(ctx.tenantId, id, dto)
    if (!booking) {
      const exists = await this.repo.exists(ctx.tenantId, id)
      if (!exists) throw new NotFoundException('Booking not found')
      throw new ConflictException('Cannot edit a cancelled booking')
    }
    this.logger.log({ id, organisationId: ctx.organisationId }, 'Booking updated')
    return booking
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
