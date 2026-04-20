import {
  Controller, Get, Post, Param, Query, Body,
  DefaultValuePipe, ParseIntPipe, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { IsArray, IsString } from 'class-validator'
import { ScoringService } from './scoring.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

class BulkScoresDto {
  @IsArray()
  @IsString({ each: true })
  personIds!: string[]
}

@ApiTags('Scores')
@Controller('v1/scores')
export class ScoringController {
  constructor(private readonly service: ScoringService) {}

  @Get()
  @ApiOperation({ summary: 'List all member scores for tenant (sorted by churn risk desc)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'minChurnRisk', required: false, description: '0-100 filter' })
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('minChurnRisk', new DefaultValuePipe(0), ParseIntPipe) minChurnRisk: number,
  ) {
    return this.service.listScores(ctx.tenantId, page, limit, minChurnRisk > 0 ? minChurnRisk : undefined)
  }

  @Get(':personId')
  @ApiOperation({ summary: 'Get scores for a specific person' })
  getOne(@TenantCtx() ctx: TenantContext, @Param('personId') personId: string) {
    return this.service.getScore(ctx.tenantId, personId)
  }

  @Post('bulk')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get scores for multiple person IDs (max 200)' })
  bulk(@TenantCtx() ctx: TenantContext, @Body() dto: BulkScoresDto) {
    const ids = dto.personIds.slice(0, 200)
    return this.service.getScoresBulk(ctx.tenantId, ids)
  }

  @Post('compute')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger score computation for tenant (use sparingly; runs nightly automatically)' })
  async compute(@TenantCtx() ctx: TenantContext) {
    await this.service.scoreTenant(ctx.tenantId)
    return { scheduled: true }
  }
}
