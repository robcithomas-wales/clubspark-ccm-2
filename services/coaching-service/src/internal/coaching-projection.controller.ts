import { BadRequestException, Controller, Get, Headers, UseGuards } from '@nestjs/common'
import { InternalSecretGuard, SkipTenant } from '@clubspark/auth'
import { CoachingProjectionService } from './coaching-projection.service.js'

@Controller('coaching-projections/internal')
@SkipTenant()
@UseGuards(InternalSecretGuard)
export class CoachingProjectionController {
  constructor(private readonly service: CoachingProjectionService) {}
  @Get('booking-occupancy-snapshot')
  snapshot(@Headers('x-tenant-id') tenantId?: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return this.service.snapshot(tenantId)
  }
}
