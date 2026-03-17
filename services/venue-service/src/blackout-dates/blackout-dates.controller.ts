import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { BlackoutDatesService } from './blackout-dates.service.js'
import { CreateBlackoutDateDto } from './dto/create-blackout-date.dto.js'
import { UpdateBlackoutDateDto } from './dto/update-blackout-date.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Controller('blackout-dates')
export class BlackoutDatesController {
  constructor(private readonly service: BlackoutDatesService) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.service.list(ctx.tenantId, venueId, resourceId)
  }

  @Get(':id')
  getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.getById(ctx.tenantId, id)
  }

  @Post()
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBlackoutDateDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBlackoutDateDto,
  ) {
    return this.service.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.service.remove(ctx.tenantId, id)
  }
}
