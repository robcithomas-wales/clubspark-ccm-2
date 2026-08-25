import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { InternalSecretGuard, SkipTenant } from '@clubspark/auth'
import { ProjectionsService } from './projections.service.js'
import { VenueProjectionEventDto } from './dto/venue-projection-event.dto.js'
import { CoachingOccupancyEventDto } from './dto/coaching-occupancy-event.dto.js'

@ApiExcludeController()
@Controller('booking-projections/internal')
@SkipTenant()
@UseGuards(InternalSecretGuard)
export class ProjectionsController {
  constructor(private readonly service: ProjectionsService) {}

  @Post('venue/refresh')
  @HttpCode(HttpStatus.OK)
  refreshVenue(@Headers('x-tenant-id') tenantId: string | undefined) {
    return this.service.refreshVenue(this.requireTenant(tenantId))
  }

  @Get('status')
  status(@Headers('x-tenant-id') tenantId: string | undefined) {
    return this.service.status(this.requireTenant(tenantId))
  }

  @Get('reconcile')
  reconcile(@Headers('x-tenant-id') tenantId: string | undefined) {
    return this.service.reconcile(this.requireTenant(tenantId))
  }

  @Post('venue/events')
  @HttpCode(HttpStatus.OK)
  applyVenueEvent(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() event: VenueProjectionEventDto,
  ) {
    return this.service.applyVenueEvent(this.requireTenant(tenantId), event)
  }

  @Post('coaching/refresh')
  @HttpCode(HttpStatus.OK)
  refreshCoaching(@Headers('x-tenant-id') tenantId: string | undefined) {
    return this.service.refreshCoaching(this.requireTenant(tenantId))
  }

  @Post('coaching/events')
  @HttpCode(HttpStatus.OK)
  applyCoachingEvent(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() event: CoachingOccupancyEventDto,
  ) {
    return this.service.applyCoachingEvent(this.requireTenant(tenantId), event)
  }

  private requireTenant(tenantId: string | undefined): string {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return tenantId
  }
}
