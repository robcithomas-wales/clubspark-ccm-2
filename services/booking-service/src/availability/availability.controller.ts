import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery } from '@nestjs/swagger'
import { AvailabilityService } from './availability.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('availability')
@ApiSecurity('tenant-id')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get('day')
  @ApiQuery({ name: 'venueId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  async getDayAvailability(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId: string,
    @Query('date') date: string,
  ) {
    const result = await this.service.getDayAvailability(ctx, venueId, date)
    return { data: result }
  }

  @Get('check')
  @ApiQuery({ name: 'bookableUnitId', required: true })
  @ApiQuery({ name: 'startsAt', required: true })
  @ApiQuery({ name: 'endsAt', required: true })
  async checkAvailability(
    @TenantCtx() ctx: TenantContext,
    @Query('bookableUnitId') bookableUnitId: string,
    @Query('startsAt') startsAt: string,
    @Query('endsAt') endsAt: string,
  ) {
    const result = await this.service.checkAvailability(ctx, bookableUnitId, startsAt, endsAt)
    return { data: result }
  }
}
