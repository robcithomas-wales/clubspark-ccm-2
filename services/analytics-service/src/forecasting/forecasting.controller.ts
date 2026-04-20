import { Controller, Get, Post, Query, Param, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ForecastingService } from './forecasting.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('Forecasting')
@Controller('v1/forecasts')
export class ForecastingController {
  constructor(private readonly service: ForecastingService) {}

  @Get()
  @ApiOperation({ summary: 'List forecast slots for tenant (default: next 14 days)' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'toDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'deadSlotsOnly', required: false, type: Boolean })
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('unitId') unitId?: string,
    @Query('deadSlotsOnly') deadSlotsOnly?: string,
  ) {
    return this.service.getForecasts(ctx.tenantId, {
      fromDate,
      toDate,
      unitId,
      deadSlotsOnly: deadSlotsOnly === 'true',
    })
  }

  @Get('dead-slots')
  @ApiOperation({ summary: 'Get units with dead slots (predicted <30% occupancy) in next 3–14 days' })
  deadSlots(@TenantCtx() ctx: TenantContext) {
    return this.service.getDeadSlots(ctx.tenantId)
  }

  @Get('dead-slots/:unitId/bookers')
  @ApiOperation({ summary: 'Get person IDs who previously booked this unit (for targeted comms)' })
  getBookers(@TenantCtx() ctx: TenantContext, @Param('unitId') unitId: string) {
    return this.service.getPreviousBookers(ctx.tenantId, unitId)
  }

  @Post('compute')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger forecast computation for tenant' })
  async compute(@TenantCtx() ctx: TenantContext) {
    return this.service.computeForTenant(ctx.tenantId)
  }
}
