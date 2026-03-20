import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery } from '@nestjs/swagger'
import { BookingsService } from './bookings.service.js'
import { CreateBookingDto } from './dto/create-booking.dto.js'
import { CreateBookingAddOnDto } from './dto/create-booking-add-on.dto.js'
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js'
import { UpdateBookingDto } from './dto/update-booking.dto.js'
import { ApproveBookingDto, RejectBookingDto } from './dto/approve-booking.dto.js'
import { BulkCancelBookingsDto } from './dto/bulk-cancel-bookings.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

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
}
