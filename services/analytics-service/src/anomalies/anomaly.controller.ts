import {
  Controller, Get, Post, Patch, Param, Query,
  DefaultValuePipe, ParseIntPipe, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { AnomalyService } from './anomaly.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('Anomalies')
@Controller('v1/anomalies')
export class AnomalyController {
  constructor(private readonly service: AnomalyService) {}

  @Get()
  @ApiOperation({ summary: 'List anomaly flags for tenant' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unresolvedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'severity', required: false, enum: ['warning', 'alert'] })
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('unresolvedOnly') unresolvedOnly?: string,
    @Query('severity') severity?: string,
  ) {
    return this.service.listAnomalies(ctx.tenantId, page, limit, {
      unresolvedOnly: unresolvedOnly !== 'false',
      severity,
    })
  }

  @Post('detect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger anomaly detection for tenant' })
  detect(@TenantCtx() ctx: TenantContext) {
    return this.service.runDetection(ctx.tenantId)
  }

  @Patch(':id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark an anomaly flag as resolved' })
  async resolve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.service.resolveAnomaly(ctx.tenantId, id)
    return { resolved: true }
  }
}
