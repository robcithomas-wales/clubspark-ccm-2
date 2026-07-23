import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator'
import { RefundPoliciesService } from './refund-policies.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

class CreateRefundPolicyDto {
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() venueId?: string | null
  @IsNumber() @Min(0) hoursBeforeStart!: number
  @IsNumber() @Min(0) @Max(100) refundPct!: number
  @IsOptional() @IsNumber() @Min(0) priority?: number
}

class UpdateRefundPolicyDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() venueId?: string | null
  @IsOptional() @IsNumber() @Min(0) hoursBeforeStart?: number
  @IsOptional() @IsNumber() @Min(0) @Max(100) refundPct?: number
  @IsOptional() @IsNumber() @Min(0) priority?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}

@ApiTags('Refund Policies')
@Controller({ path: 'refund-policies', version: '1' })
export class RefundPoliciesController {
  constructor(private readonly svc: RefundPoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List all refund policies for the tenant' })
  async list(@TenantCtx() ctx: TenantContext) {
    const data = await this.svc.list(ctx.tenantId)
    return { data }
  }

  @Get(':id')
  async getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const data = await this.svc.getById(ctx.tenantId, id)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateRefundPolicyDto) {
    const data = await this.svc.create(ctx.tenantId, dto)
    return { data }
  }

  @Patch(':id')
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateRefundPolicyDto,
  ) {
    const data = await this.svc.update(ctx.tenantId, id, dto)
    return { data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.svc.delete(ctx.tenantId, id)
  }
}
