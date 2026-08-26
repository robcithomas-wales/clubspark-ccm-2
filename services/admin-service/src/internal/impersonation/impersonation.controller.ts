import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { ImpersonationService } from './impersonation.service.js'
import { StartImpersonationDto } from './dto/start-impersonation.dto.js'
import { InternalSecretGuard } from '@clubspark/auth'
import {
  StaffAttributionInterceptor,
  type InternalContext,
} from '../staff-attribution.interceptor.js'
import { AuditService } from '../audit/audit.service.js'

type InternalReq = FastifyRequest & { internalContext: InternalContext }

@ApiTags('internal/impersonation')
@UseGuards(InternalSecretGuard)
@UseInterceptors(StaffAttributionInterceptor)
@Controller({ version: '1' })
export class ImpersonationController {
  constructor(
    private readonly service: ImpersonationService,
    private readonly audit: AuditService,
  ) {}

  @Get('internal/impersonation')
  @ApiOperation({ summary: 'List all impersonation sessions' })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('staffId') staffId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const result = await this.service.listAll({
      staffId,
      tenantId,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    }
  }

  @Get('internal/impersonation/active')
  @ApiOperation({ summary: 'List currently active impersonation sessions' })
  async listActive() {
    const data = await this.service.listActive()
    return { data }
  }

  @Post('internal/organisations/:tenantId/impersonate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start an impersonation session for a target admin user' })
  async start(
    @Request() req: InternalReq,
    @Param('tenantId') tenantId: string,
    @Body() dto: StartImpersonationDto,
  ) {
    const data = await this.service.start(tenantId, dto, req.internalContext)
    void this.audit.log(
      req.internalContext,
      tenantId,
      'impersonation.started',
      'user',
      dto.targetUserId,
      { sessionId: data.id, reason: dto.reason, targetEmail: dto.targetEmail },
    )
    return { data }
  }

  @Post('internal/impersonation/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an active impersonation session' })
  async end(@Request() req: InternalReq, @Param('sessionId') sessionId: string) {
    const data = await this.service.end(sessionId, req.internalContext)
    void this.audit.log(
      req.internalContext,
      data.tenantId,
      'impersonation.ended',
      'impersonation_session',
      sessionId,
    )
    return { data }
  }
}
