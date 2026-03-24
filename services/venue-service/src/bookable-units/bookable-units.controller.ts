import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery } from '@nestjs/swagger'
import { BookableUnitsService } from './bookable-units.service.js'
import { CreateBookableUnitDto } from './dto/create-bookable-unit.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('bookable-units')
@ApiSecurity('tenant-id')
@Controller()
export class BookableUnitsController {
  constructor(private readonly service: BookableUnitsService) {}

  @Get('bookable-units')
  @ApiQuery({ name: 'sport', required: false, type: String })
  async listAll(@TenantCtx() ctx: TenantContext, @Query('sport') sport?: string) {
    const units = sport
      ? await this.service.listBySport(ctx.tenantId, sport)
      : await this.service.listAll(ctx.tenantId)
    return { data: units }
  }

  @Post('bookable-units')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookableUnitDto, @TenantCtx() ctx: TenantContext) {
    const unit = await this.service.create(ctx.tenantId, dto)
    return { data: unit }
  }

  @Get('venues/:venueId/units')
  async listByVenue(@Param('venueId') venueId: string, @TenantCtx() ctx: TenantContext) {
    const units = await this.service.listByVenue(ctx.tenantId, venueId)
    return { venueId, data: units }
  }

  @Get('units/:id/conflicts')
  async getConflicts(@Param('id') id: string) {
    return this.service.getConflicts(id)
  }
}
