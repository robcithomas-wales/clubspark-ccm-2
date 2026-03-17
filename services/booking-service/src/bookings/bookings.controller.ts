import {
  Controller,
  Get,
  Post,
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
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('bookings')
@ApiSecurity('tenant-id')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page = 1,
    @Query('limit') limit = 25,
  ) {
    const result = await this.service.list(ctx, Number(page), Number(limit))
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
