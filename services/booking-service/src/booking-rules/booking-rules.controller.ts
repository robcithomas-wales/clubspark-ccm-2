import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { BookingRulesService } from './booking-rules.service.js'
import { CreateBookingRuleDto } from './dto/create-booking-rule.dto.js'
import { UpdateBookingRuleDto } from './dto/update-booking-rule.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('booking-rules')
@ApiSecurity('tenant-id')
@Controller('booking-rules')
export class BookingRulesController {
  constructor(private readonly service: BookingRulesService) {}

  @Get()
  async list(@TenantCtx() ctx: TenantContext) {
    const rules = await this.service.list(ctx)
    return { data: rules }
  }

  @Get(':id')
  async getById(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const rule = await this.service.getById(ctx, id)
    return { data: rule }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingRuleDto, @TenantCtx() ctx: TenantContext) {
    const rule = await this.service.create(ctx, dto)
    return { data: rule }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingRuleDto,
    @TenantCtx() ctx: TenantContext,
  ) {
    const rule = await this.service.update(ctx, id, dto)
    return { data: rule }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    await this.service.delete(ctx, id)
  }
}
