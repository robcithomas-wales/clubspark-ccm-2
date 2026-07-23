import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PricingService } from './pricing.service.js'
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto.js'
import { TenantContext, TenantCtx } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('pricing-rules')
@ApiBearerAuth()
@Controller({ path: 'pricing-rules', version: '1' })
export class PricingController {
  constructor(private readonly service: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'List all pricing rules for the tenant' })
  async list(@TenantCtx() ctx: TenantContext) {
    const rules = await this.service.listRules(ctx)
    return { data: rules, total: rules.length }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pricing rule by ID' })
  async getOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const rule = await this.service.getRule(ctx, id)
    if (!rule) throw new NotFoundException('Pricing rule not found')
    return { data: rule }
  }

  @Post()
  @ApiOperation({ summary: 'Create a pricing rule' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePricingRuleDto) {
    const rule = await this.service.createRule(ctx, dto)
    return { data: rule }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pricing rule' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePricingRuleDto>,
  ) {
    const existing = await this.service.getRule(ctx, id)
    if (!existing) throw new NotFoundException('Pricing rule not found')
    const rule = await this.service.updateRule(ctx, id, dto)
    return { data: rule }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a pricing rule' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const existing = await this.service.getRule(ctx, id)
    if (!existing) throw new NotFoundException('Pricing rule not found')
    await this.service.deleteRule(ctx, id)
  }
}
