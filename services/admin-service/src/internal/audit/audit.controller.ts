import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { AuditService } from './audit.service.js'
import { InternalGuard, type InternalContext } from '../guards/internal.guard.js'

type InternalReq = FastifyRequest & { internalContext: InternalContext }

@ApiTags('internal/audit')
@UseGuards(InternalGuard)
@Controller({ path: 'internal/audit', version: '1' })
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query the internal audit log' })
  async list(
    @Request() req: InternalReq,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('staffId') staffId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
  ) {
    const result = await this.service.findMany({
      staffId,
      tenantId,
      action,
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
}
