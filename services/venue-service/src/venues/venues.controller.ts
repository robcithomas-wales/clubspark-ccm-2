import { Controller, Get, Put, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { IsOptional, IsBoolean, IsString } from 'class-validator'
import { VenuesService } from './venues.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

class UpsertVenueSettingsDto {
  @IsOptional() @IsBoolean() openBookings?: boolean
  @IsOptional() @IsBoolean() addOnsEnabled?: boolean
  @IsOptional() @IsBoolean() pendingApprovals?: boolean
  @IsOptional() @IsBoolean() splitPayments?: boolean
  @IsOptional() @IsString() publicBookingView?: string
}

@ApiTags('venues')
@ApiSecurity('tenant-id')
@Controller('venues')
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Get()
  async list(@TenantCtx() ctx: TenantContext) {
    const venues = await this.service.listVenues(ctx.tenantId)
    return { data: venues }
  }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) {
    const settings = await this.service.getSettings(id)
    return { data: settings ?? { venueId: id } }
  }

  @Put(':id/settings')
  @HttpCode(HttpStatus.OK)
  async upsertSettings(@Param('id') id: string, @Body() dto: UpsertVenueSettingsDto) {
    const settings = await this.service.upsertSettings(id, dto)
    return { data: settings }
  }
}
