import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common'
import { IsString, IsArray, IsOptional, IsNotEmpty, ArrayMinSize } from 'class-validator'
import { InternalSecretGuard } from '../common/guards/internal-secret.guard'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator'
import { MembershipsService } from './memberships.service'
import { CreateMembershipDto } from './dto/create-membership.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'
import { TransitionMembershipDto } from './dto/transition-membership.dto'

/** Body for the internal customer-merge hook. */
class ReassignCustomerDto {
  @IsString()
  @IsNotEmpty()
  fromCustomerId!: string

  @IsString()
  @IsNotEmpty()
  toCustomerId!: string
}

class BulkTransitionDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[]

  @IsString()
  action!: string

  @IsOptional()
  @IsString()
  reason?: string
}

class RecordPaymentDto {
  @IsString()
  paymentStatus!: string

  @IsOptional()
  @IsString()
  paymentMethod?: string

  @IsOptional()
  @IsString()
  paymentReference?: string

  @IsOptional()
  paymentAmount?: number
}

class TransferPlanDto {
  @IsString()
  planId!: string

  @IsOptional()
  @IsString()
  reason?: string
}

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getStats(tenantId, organisationId).then((data) => ({ data }))
  }

  @Get('stats/daily')
  getDailyStats(@Req() req: any, @Query('months') months?: number) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getDailyStats(tenantId, organisationId, Number(months) || 12).then((data) => ({ data }))
  }

  @Get('renewals-due')
  listExpiringRenewals(
    @Req() req: any,
    @Query('days') days?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.listExpiringRenewals(tenantId, organisationId, Number(days) || 30)
  }

  @Post('process-renewals')
  @HttpCode(HttpStatus.OK)
  processRenewals(@Query('withinDays') withinDays?: number) {
    return this.service.processRenewals(Number(withinDays) || 30)
  }

  @Get()
  list(
    @Req() req: any,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('renewingWithinDays') renewingWithinDays?: number,
    @Query('customerId') customerId?: string,
    @Query('ownerType') ownerType?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.list(tenantId, organisationId, {
      planId, status, paymentStatus,
      renewingWithinDays: renewingWithinDays ? Number(renewingWithinDays) : undefined,
      customerId, ownerType, ownerId, search, limit, offset,
    })
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getById(tenantId, organisationId, id)
  }

  @Get(':id/history')
  getHistory(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getHistory(tenantId, organisationId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateMembershipDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Post('bulk-transition')
  bulkTransition(@Req() req: any, @Body() dto: BulkTransitionDto) {
    const { tenantId, organisationId } = req.tenantContext
    const actorEmail: string | null = req.tenantContext.email ?? null
    return this.service.bulkTransition(tenantId, organisationId, dto.ids, dto.action, dto.reason ?? null, actorEmail)
  }

  @Post(':id/transition')
  transition(@Req() req: any, @Param('id') id: string, @Body() dto: TransitionMembershipDto) {
    const { tenantId, organisationId } = req.tenantContext
    const actorEmail: string | null = req.tenantContext.email ?? null
    return this.service.transition(tenantId, organisationId, id, dto, actorEmail)
  }

  @Post(':id/record-payment')
  recordPayment(@Req() req: any, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.recordPayment(tenantId, organisationId, id, dto)
  }

  @Post(':id/transfer')
  transferPlan(@Req() req: any, @Param('id') id: string, @Body() dto: TransferPlanDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.transferPlan(tenantId, organisationId, id, dto.planId, dto.reason ?? null)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.update(tenantId, organisationId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    await this.service.remove(tenantId, organisationId, id)
  }

  /**
   * Service-to-service only: re-point this tenant's memberships from one customer
   * id to another. Called by people-service when merging two person records.
   *
   * `@SkipTenant()` because a service-to-service caller has no end-user JWT to
   * present — the tenant guard would reject it outside test/dev. Authentication
   * is therefore entirely `InternalSecretGuard` (fail-closed except under test),
   * and the tenant comes from the explicit `x-tenant-id` header.
   *
   * Deliberately tenant-wide, NOT scoped to an organisation: a person is a
   * tenant-level entity, so a merge must move their memberships in every
   * organisation. This is the one method in this controller that is not
   * organisation-scoped. Idempotent — safe to retry.
   */
  @Post('internal/reassign-customer')
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @HttpCode(HttpStatus.OK)
  reassignCustomer(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Body() dto: ReassignCustomerDto,
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return this.service.reassignCustomer(tenantId, dto.fromCustomerId, dto.toCustomerId)
  }
}
