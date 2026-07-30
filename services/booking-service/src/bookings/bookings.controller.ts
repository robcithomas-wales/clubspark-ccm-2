import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger'
import { BookingsService } from './bookings.service.js'
import { CreateBookingDto } from './dto/create-booking.dto.js'
import { CreateBookingAddOnDto } from './dto/create-booking-add-on.dto.js'
import { CreateBookingParticipantDto } from './dto/create-booking-participant.dto.js'
import { CreatePaymentSplitDto } from './dto/create-payment-split.dto.js'
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js'
import { UpdateBookingDto } from './dto/update-booking.dto.js'
import { ApproveBookingDto, RejectBookingDto } from './dto/approve-booking.dto.js'
import { BulkCancelBookingsDto } from './dto/bulk-cancel-bookings.dto.js'
import { ReassignCustomerDto } from './dto/reassign-customer.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'
import { InternalSecretGuard } from '../common/guards/internal-secret.guard.js'

@ApiTags('bookings')
@ApiSecurity('tenant-id')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('customerId') customerId?: string,
  ) {
    const result = await this.service.list(ctx, Number(page), Number(limit), { status, fromDate, toDate, customerId })
    return {
      data: result.rows,
      pagination: {
        total: result.total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    }
  }

  @Get('stats')
  async getStats(@TenantCtx() ctx: TenantContext) {
    const stats = await this.service.getStats(ctx)
    return { data: stats }
  }

  @Get('stats/daily')
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getDailyStats(@TenantCtx() ctx: TenantContext, @Query('days') days = 30) {
    const stats = await this.service.getDailyStats(ctx, Number(days))
    return { data: stats }
  }

  @Get('stats/summary')
  async getStatsSummary(@TenantCtx() ctx: TenantContext) {
    const stats = await this.service.getStatsSummary(ctx)
    return { data: stats }
  }

  @Get('stats/by-unit')
  async getStatsByUnit(@TenantCtx() ctx: TenantContext) {
    const stats = await this.service.getStatsByUnit(ctx)
    return { data: stats }
  }

  @Get('stats/by-dow')
  async getStatsByDow(@TenantCtx() ctx: TenantContext) {
    const stats = await this.service.getStatsByDow(ctx)
    return { data: stats }
  }

    @Get('unit-busy-times')
  @ApiQuery({ name: 'unitIds', required: true, type: String })
  @ApiQuery({ name: 'date', required: true, type: String })
  async getUnitBusyTimes(
    @TenantCtx() ctx: TenantContext,
    @Query('unitIds') unitIdsRaw: string,
    @Query('date') date: string,
  ) {
    const unitIds = unitIdsRaw ? unitIdsRaw.split(',') : []
    const data = await this.service.getUnitBusyTimes(ctx.tenantId, unitIds, date)
    return { data }
  }

  @Get('stats/customers')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopCustomers(@TenantCtx() ctx: TenantContext, @Query('limit') limit = 20) {
    const stats = await this.service.getTopCustomers(ctx, Number(limit))
    return { data: stats }
  }

  @Get(':id')
  async getById(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const booking = await this.service.getById(ctx, id)
    return { data: booking }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingDto, @TenantCtx() ctx: TenantContext) {
    const booking = await this.service.create(ctx, dto)
    return { data: booking }
  }

  @Patch(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const booking = await this.service.updatePaymentStatus(ctx, id, dto)
    return { data: booking }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const booking = await this.service.update(ctx, id, dto)
    return { data: booking }
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveBookingDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const booking = await this.service.approve(ctx, id, dto.approvedBy)
    return { data: booking }
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const booking = await this.service.reject(ctx, id, dto.reason)
    return { data: booking }
  }

  @Post('bulk-cancel')
  @HttpCode(HttpStatus.OK)
  async bulkCancel(@Body() dto: BulkCancelBookingsDto, @TenantCtx() ctx: TenantContext) {
    const result = await this.service.bulkCancel(ctx, dto.ids)
    return { data: result }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const booking = await this.service.cancel(ctx, id)
    return { data: booking }
  }

  @Get(':id/add-ons')
  async listAddOns(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const addOns = await this.service.listAddOns(ctx, id)
    return { data: addOns }
  }

  @Post(':id/add-ons')
  @HttpCode(HttpStatus.CREATED)
  async createAddOn(
    @Param('id') id: string,
    @Body() dto: CreateBookingAddOnDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const addOn = await this.service.createAddOn(ctx, id, dto)
    return { data: addOn }
  }

  // ─── Participants ────────────────────────────────────────────────────────────

  @Get(':id/participants')
  async listParticipants(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const data = await this.service.listParticipants(ctx, id)
    return { data }
  }

  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  async addParticipant(
    @Param('id') id: string,
    @Body() dto: CreateBookingParticipantDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const data = await this.service.addParticipant(ctx, id, dto)
    return { data }
  }

  @Delete(':id/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @TenantCtx() ctx: TenantContext,
  ) {
    await this.service.removeParticipant(ctx, id, participantId)
  }

  // ─── Payment splits ──────────────────────────────────────────────────────────

  @Get(':id/payment-splits')
  async listPaymentSplits(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const data = await this.service.listPaymentSplits(ctx, id)
    return { data }
  }

  @Post(':id/payment-splits')
  @HttpCode(HttpStatus.CREATED)
  async addPaymentSplit(
    @Param('id') id: string,
    @Body() dto: CreatePaymentSplitDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const data = await this.service.addPaymentSplit(ctx, id, dto)
    return { data }
  }

  @Delete(':id/payment-splits/:splitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePaymentSplit(
    @Param('id') id: string,
    @Param('splitId') splitId: string,
    @TenantCtx() ctx: TenantContext,
  ) {
    await this.service.removePaymentSplit(ctx, id, splitId)
  }

  /**
   * Service-to-service only: re-point this tenant's bookings from one customer id
   * to another. Called by people-service when merging two person records.
   *
   * `@SkipTenant()` because a service-to-service caller has no end-user JWT to
   * present — the tenant guard would reject it outside test/dev. Authentication
   * is therefore entirely `InternalSecretGuard` (fail-closed except under test),
   * and the tenant is taken from the explicit `x-tenant-id` header, matching the
   * platform's existing internal-endpoint pattern (integration-service
   * events/inbound, comms-service).
   *
   * Idempotent — safe to retry.
   */
  @Post('internal/reassign-customer')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async reassignCustomer(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: ReassignCustomerDto,
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    const data = await this.service.reassignCustomer(tenantId, dto.fromCustomerId, dto.toCustomerId)
    return { data }
  }
}
