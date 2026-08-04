import { Controller, Get, Param, Query, Req, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiQuery } from '@nestjs/swagger'
import { EntitlementsService } from './entitlements.service.js'
import type { TenantContext } from '@clubspark/auth'

type RequestWithCtx = { tenantContext?: TenantContext }

@ApiTags('entitlements')
@Controller('v1/entitlements')
export class EntitlementsController {
  constructor(private readonly service: EntitlementsService) {}

  /**
   * Check a single feature for an org.
   * Called by other services at the point of feature access.
   * @example GET /v1/entitlements/check?orgId=abc&feature=multisite
   */
  @Get('check')
  @ApiQuery({ name: 'orgId', required: true })
  @ApiQuery({ name: 'feature', required: true })
  async check(
    @Req() req: RequestWithCtx,
    @Query('orgId') orgId: string,
    @Query('feature') feature: string,
  ) {
    if (!orgId || !feature) {
      throw new BadRequestException('orgId and feature are required')
    }
    const { tenantId } = req.tenantContext as TenantContext
    const result = await this.service.check(orgId, feature, tenantId)
    return { data: result }
  }

  /**
   * Resolve all features for an org in one call.
   * Used by the portal on load to avoid per-feature round-trips.
   */
  @Get('org/:orgId')
  getAll(@Req() req: RequestWithCtx, @Param('orgId') orgId: string) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.getAll(orgId, tenantId)
  }
}
