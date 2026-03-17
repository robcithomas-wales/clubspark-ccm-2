import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { VenuesService } from './venues.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

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
}
