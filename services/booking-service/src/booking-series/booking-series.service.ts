import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { BookingSeriesRepository } from './booking-series.repository.js'
import { BookingsRepository } from '../bookings/bookings.repository.js'
import { AvailabilityRepository } from '../availability/availability.repository.js'
import type { CreateBookingSeriesDto } from './dto/create-booking-series.dto.js'
import type { CancelBookingSeriesDto } from './dto/cancel-booking-series.dto.js'
import type { UpdateBookingSeriesDto } from './dto/update-booking-series.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Injectable()
export class BookingSeriesService {
  private readonly logger = new Logger(BookingSeriesService.name)

  constructor(
    private readonly seriesRepo: BookingSeriesRepository,
    private readonly bookingsRepo: BookingsRepository,
    private readonly availabilityRepo: AvailabilityRepository,
  ) {}

  async list(ctx: TenantContext) {
    return this.seriesRepo.findAll(ctx.tenantId)
  }

  async getById(ctx: TenantContext, id: string) {
    const series = await this.seriesRepo.findById(ctx.tenantId, id)
    if (!series) throw new NotFoundException('Booking series not found')
    const bookings = await this.seriesRepo.findBookingsForSeries(ctx.tenantId, id)
    return { ...series, bookings }
  }

  async create(ctx: TenantContext, dto: CreateBookingSeriesDto) {
    // Validate the bookable unit
    const unit = await this.bookingsRepo.findBookableUnit(ctx.tenantId, dto.bookableUnitId)
    if (!unit) throw new NotFoundException('Bookable unit not found')
    if (!unit.isActive) throw new ConflictException('Bookable unit is inactive')
    if (unit.venueId !== dto.venueId)
      throw new BadRequestException('Bookable unit does not belong to the specified venue')
    if (unit.resourceId !== dto.resourceId)
      throw new BadRequestException('Bookable unit does not belong to the specified resource')

    if (new Date(dto.endsAt) <= new Date(dto.startsAt))
      throw new BadRequestException('endsAt must be after startsAt')

    const conflictMap = await this.availabilityRepo.getConflictMapForUnits([dto.bookableUnitId])
    const unitIds = conflictMap.get(dto.bookableUnitId) ?? [dto.bookableUnitId]

    this.logger.log(
      { organisationId: ctx.organisationId, bookableUnitId: dto.bookableUnitId, rrule: dto.rrule },
      'Creating booking series',
    )

    try {
      const result = await this.seriesRepo.createWithBookings(
        ctx.tenantId,
        ctx.organisationId ?? ctx.tenantId,
        unitIds,
        dto,
      )

      this.logger.log(
        { seriesId: result.series?.id, count: result.bookings.length },
        'Booking series created',
      )

      return result
    } catch (err) {
      if ((err as Error).message === 'SERIES_CONFLICT') {
        throw new ConflictException('One or more occurrences conflict with existing bookings')
      }
      if ((err as Error).message === 'RRULE produced no occurrences') {
        throw new BadRequestException('The RRULE produced no occurrences')
      }
      throw err
    }
  }

  async cancel(ctx: TenantContext, id: string, dto: CancelBookingSeriesDto) {
    const series = await this.seriesRepo.findById(ctx.tenantId, id)
    if (!series) throw new NotFoundException('Booking series not found')
    if (series.status === 'cancelled') throw new ConflictException('Series is already cancelled')

    if (dto.mode === 'from_date' && !dto.fromDate)
      throw new BadRequestException('fromDate is required for from_date mode')
    if (dto.mode === 'single' && !dto.bookingId)
      throw new BadRequestException('bookingId is required for single mode')

    const count = await this.seriesRepo.cancelBookings(
      ctx.tenantId,
      id,
      dto.mode,
      dto.fromDate,
      dto.bookingId,
    )

    this.logger.log(
      { seriesId: id, mode: dto.mode, cancelled: count, organisationId: ctx.organisationId },
      'Booking series cancelled',
    )

    return { cancelled: count }
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBookingSeriesDto) {
    const series = await this.seriesRepo.findById(ctx.tenantId, id)
    if (!series) throw new NotFoundException('Booking series not found')

    if (dto.mode === 'from_date' && !dto.fromDate)
      throw new BadRequestException('fromDate is required for from_date mode')
    if (dto.mode === 'single' && !dto.bookingId)
      throw new BadRequestException('bookingId is required for single mode')

    const count = await this.seriesRepo.updateBookings(ctx.tenantId, id, dto)

    this.logger.log(
      { seriesId: id, mode: dto.mode, updated: count, organisationId: ctx.organisationId },
      'Booking series updated',
    )

    return { updated: count }
  }
}
