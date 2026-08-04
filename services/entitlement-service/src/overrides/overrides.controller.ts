import { Controller, Get, Put, Delete, Param, Body, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { OverridesService } from './overrides.service.js'
import { UpsertOverrideDto } from './dto/upsert-override.dto.js'
import type { TenantContext } from '@clubspark/auth'

type RequestWithCtx = { tenantContext?: TenantContext }

@ApiTags('overrides')
@Controller('v1/overrides')
export class OverridesController {
  constructor(private readonly service: OverridesService) {}

  /** Get the pricing override for an org (null if none set). */
  @Get('org/:orgId')
  getByOrg(@Req() req: RequestWithCtx, @Param('orgId') orgId: string) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.getByOrg(orgId, tenantId)
  }

  /** Set or replace the pricing override for an org. */
  @Put()
  upsert(@Req() req: RequestWithCtx, @Body() dto: UpsertOverrideDto) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.upsert(tenantId, dto)
  }

  /** Remove the pricing override for an org. */
  @Delete('org/:orgId')
  remove(@Req() req: RequestWithCtx, @Param('orgId') orgId: string) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.remove(orgId, tenantId)
  }
}
