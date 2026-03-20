import { Controller, Patch, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { LifecycleService } from './lifecycle.service.js'
import { TransitionLifecycleDto } from './dto/transition-lifecycle.dto.js'

@ApiTags('lifecycle')
@Controller('people/:id/lifecycle')
export class LifecycleController {
  constructor(private readonly service: LifecycleService) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition customer lifecycle state' })
  transition(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: TransitionLifecycleDto,
  ) {
    return this.service.transition(req.tenantContext.tenantId, id, dto)
  }

  @Get('history')
  @ApiOperation({ summary: 'Get lifecycle history for a customer' })
  getHistory(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.getHistory(req.tenantContext.tenantId, id)
  }
}
