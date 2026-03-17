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
import { AvailabilityConfigsService } from './availability-configs.service.js'
import { CreateAvailabilityConfigDto } from './dto/create-availability-config.dto.js'
import { UpdateAvailabilityConfigDto } from './dto/update-availability-config.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Controller('availability-configs')
export class AvailabilityConfigsController {
  constructor(private readonly service: AvailabilityConfigsService) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.service.list(ctx.tenantId, scopeType, scopeId)
  }

  /**
   * GET /availability-configs/effective?resourceId=...&venueId=...&dayOfWeek=1
   * Returns the merged effective config for a specific resource and day.
   */
  @Get('effective')
  getEffective(
    @TenantCtx() ctx: TenantContext,
    @Query('resourceId') resourceId: string,
    @Query('venueId') venueId: string,
    @Query('groupId') groupId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
  ) {
    const dow = dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : new Date().getDay()
    return this.service.getEffective(
      ctx.tenantId,
      resourceId,
      groupId ?? null,
      venueId,
      dow,
    )
  }

  @Get(':id')
  getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.getById(ctx.tenantId, id)
  }

  @Post()
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateAvailabilityConfigDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityConfigDto,
  ) {
    return this.service.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.service.remove(ctx.tenantId, id)
  }
}
