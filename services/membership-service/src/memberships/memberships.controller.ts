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
} from '@nestjs/common'
import { IsString, IsArray, IsOptional } from 'class-validator'
import { MembershipsService } from './memberships.service'
import { CreateMembershipDto } from './dto/create-membership.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'
import { TransitionMembershipDto } from './dto/transition-membership.dto'

class BulkTransitionDto {
  @IsArray()
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
}
