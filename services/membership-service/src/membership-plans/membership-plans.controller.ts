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
import { MembershipPlansService } from './membership-plans.service'
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto'
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto'
import { SetPlanEligibilityDto } from './dto/set-plan-eligibility.dto'

@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly service: MembershipPlansService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('schemeId') schemeId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('orgId') orgId?: string,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    const resolvedOrgId = organisationId ?? orgId ?? null
    return this.service.list(tenantId, resolvedOrgId, { schemeId, status, search, limit, offset })
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getById(tenantId, organisationId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateMembershipPlanDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMembershipPlanDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.update(tenantId, organisationId, id, dto)
  }

  @Get(':id/eligibility')
  getEligibility(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getEligibility(tenantId, organisationId, id)
  }

  @Put(':id/eligibility')
  setEligibility(@Req() req: any, @Param('id') id: string, @Body() dto: SetPlanEligibilityDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.setEligibility(tenantId, organisationId, id, dto)
  }
}
