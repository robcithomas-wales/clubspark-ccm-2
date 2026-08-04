import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SubscriptionsService } from './subscriptions.service.js'
import { AssignPlanDto } from './dto/assign-plan.dto.js'
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js'
import type { TenantContext } from '@clubspark/auth'

type RequestWithCtx = { tenantContext?: TenantContext }

@ApiTags('subscriptions')
@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  /** List all org subscriptions for the calling tenant. */
  @Get()
  listByTenant(@Req() req: RequestWithCtx) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.listByTenant(tenantId)
  }

  /** Get a single org's subscription. */
  @Get('org/:orgId')
  getByOrg(@Req() req: RequestWithCtx, @Param('orgId') orgId: string) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.getByOrg(orgId, tenantId)
  }

  /** Assign (or reassign) a plan to an org. */
  @Post()
  assign(@Req() req: RequestWithCtx, @Body() dto: AssignPlanDto) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.assign(tenantId, dto)
  }

  /** Update billing cycle or status for an org's subscription. */
  @Patch('org/:orgId')
  update(
    @Req() req: RequestWithCtx,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.update(orgId, tenantId, dto)
  }
}
