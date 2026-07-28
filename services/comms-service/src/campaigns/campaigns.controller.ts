import { Controller, Post, Get, Patch, Param, Body, Query, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, IsIn } from 'class-validator'
import { Tenant, TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { CampaignsService } from './campaigns.service.js'

class CreateCampaignDto {
  @IsOptional() @IsString() name?: string
  @IsIn(['email', 'sms']) channel!: 'email' | 'sms'
  @IsOptional() @IsString() subject?: string
  @IsOptional() @IsString() body?: string
  @IsOptional() @IsString() replyTo?: string
  @IsString() audienceDefinition!: string   // JSON string
  @IsOptional() @IsString() scheduledAt?: string  // ISO — Premium
  @IsOptional() @IsIn(['draft', 'scheduled', 'sent']) status?: string
}

class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() subject?: string
  @IsOptional() @IsString() body?: string
  @IsOptional() @IsString() replyTo?: string
  @IsOptional() @IsString() audienceDefinition?: string
  @IsOptional() @IsString() scheduledAt?: string
  @IsOptional() @IsIn(['draft', 'scheduled', 'sent']) status?: string
}

@ApiTags('Campaigns')
@Controller({ path: 'campaigns', version: '1' })
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and send (or schedule) a campaign' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateCampaignDto) {
    const createdBy = ctx.organisationId ?? ctx.tenantId
    return this.svc.create(ctx.tenantId, createdBy, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns for the tenant' })
  list(@Tenant() ctx: TenantContext) {
    return this.svc.findAll(ctx.tenantId)
  }

  /**
   * GET /campaigns/preview-recipients
   * Returns estimated recipient count (eligible + excluded) for an audience
   * without dispatching anything.
   */
  @Get('preview-recipients')
  @ApiOperation({ summary: 'Preview recipient count for an audience definition' })
  previewRecipients(
    @Tenant() ctx: TenantContext,
    @Query('audienceType') audienceType: string,
    @Query('segmentId') segmentId?: string,
    @Query('manualCount') manualCount?: string,
  ) {
    return this.svc.previewRecipients(ctx.tenantId, audienceType, segmentId, manualCount ? parseInt(manualCount, 10) : undefined)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single campaign by ID' })
  async getById(@Tenant() ctx: TenantContext, @Param('id') id: string) {
    const campaign = await this.svc.findById(ctx.tenantId, id)
    if (!campaign) throw new NotFoundException('Campaign not found')
    return { data: campaign }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft campaign (or re-schedule)' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.svc.update(ctx.tenantId, id, dto)
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Per-campaign analytics from the message log' })
  stats(@Tenant() ctx: TenantContext, @Param('id') id: string) {
    return this.svc.getStats(ctx.tenantId, id)
  }

  @Post(':id/dispatch')
  @ApiOperation({ summary: 'Manually trigger dispatch of a draft or scheduled campaign' })
  async dispatch(@Tenant() ctx: TenantContext, @Param('id') id: string) {
    // Verify the campaign belongs to the caller's tenant BEFORE dispatching —
    // otherwise any authenticated user could send another tenant's campaign.
    const campaign = await this.svc.findById(ctx.tenantId, id)
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.svc.dispatch(id)
  }
}
