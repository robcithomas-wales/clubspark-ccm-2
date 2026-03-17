import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { BookingSeriesService } from './booking-series.service.js'
import { CreateBookingSeriesDto } from './dto/create-booking-series.dto.js'
import { CancelBookingSeriesDto } from './dto/cancel-booking-series.dto.js'
import { UpdateBookingSeriesDto } from './dto/update-booking-series.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('booking-series')
@ApiSecurity('tenant-id')
@Controller('booking-series')
export class BookingSeriesController {
  constructor(private readonly service: BookingSeriesService) {}

  @Get()
  async list(@TenantCtx() ctx: TenantContext) {
    const series = await this.service.list(ctx)
    return { data: series }
  }

  @Get(':id')
  async getById(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const series = await this.service.getById(ctx, id)
    return { data: series }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingSeriesDto, @TenantCtx() ctx: TenantContext) {
    const result = await this.service.create(ctx, dto)
    return { data: result }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingSeriesDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const result = await this.service.cancel(ctx, id, dto)
    return { data: result }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingSeriesDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const result = await this.service.update(ctx, id, dto)
    return { data: result }
  }
}
