import {
  Controller, Get, Put, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { FeatureFlagsService } from './feature-flags.service.js'
import { SetFlagDto } from './dto/set-flag.dto.js'
import { InternalGuard, type InternalContext } from '../guards/internal.guard.js'
import { AuditService } from '../audit/audit.service.js'

type InternalReq = FastifyRequest & { internalContext: InternalContext }

@ApiTags('internal/feature-flags')
@UseGuards(InternalGuard)
@Controller({ path: 'internal/organisations/:tenantId/flags', version: '1' })
export class FeatureFlagsController {
  constructor(
    private readonly service: FeatureFlagsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all flags for a tenant (known flags + overrides)' })
  async list(@Param('tenantId') tenantId: string) {
    const data = await this.service.listForTenant(tenantId)
    return { data }
  }

  @Put(':flag')
  @ApiOperation({ summary: 'Enable or disable a feature flag for a tenant' })
  async setFlag(
    @Request() req: InternalReq,
    @Param('tenantId') tenantId: string,
    @Param('flag') flag: string,
    @Body() dto: SetFlagDto,
  ) {
    const data = await this.service.setFlag(tenantId, flag, dto, req.internalContext)
    void this.audit.log(
      req.internalContext,
      tenantId,
      dto.enabled ? 'flag.enabled' : 'flag.disabled',
      'feature_flag',
      flag,
      { flag, enabled: dto.enabled, reason: dto.overrideReason },
    )
    return { data }
  }

  @Delete(':flag')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset a flag to its global default (remove the override)' })
  async resetFlag(
    @Request() req: InternalReq,
    @Param('tenantId') tenantId: string,
    @Param('flag') flag: string,
  ) {
    await this.service.resetFlag(tenantId, flag)
    void this.audit.log(req.internalContext, tenantId, 'flag.reset', 'feature_flag', flag)
  }
}
