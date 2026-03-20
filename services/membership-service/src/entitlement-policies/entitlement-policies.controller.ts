import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common'
import { EntitlementPoliciesService } from './entitlement-policies.service'
import { CreateEntitlementPolicyDto } from './dto/create-entitlement-policy.dto'
import { ReplacePlanEntitlementsDto } from './dto/replace-plan-entitlements.dto'

@Controller('entitlement-policies')
export class EntitlementPoliciesController {
  constructor(private readonly service: EntitlementPoliciesService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.list(tenantId, organisationId, { limit, offset })
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getById(tenantId, organisationId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateEntitlementPolicyDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.update(tenantId, organisationId, id, dto)
  }
}

@Controller('membership-plans/:planId/entitlements')
export class PlanEntitlementsController {
  constructor(private readonly service: EntitlementPoliciesService) {}

  @Get()
  getForPlan(@Req() req: any, @Param('planId') planId: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getPlanEntitlements(tenantId, organisationId, planId)
  }

  @Put()
  replaceForPlan(
    @Req() req: any,
    @Param('planId') planId: string,
    @Body() dto: ReplacePlanEntitlementsDto,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.replacePlanEntitlements(tenantId, planId, dto)
  }
}
