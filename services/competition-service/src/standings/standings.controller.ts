import { Controller, Get, Post, Param, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { StandingsService } from './standings.service.js'

@ApiTags('standings')
@Controller('competitions/:competitionId/divisions/:divisionId/standings')
export class StandingsController {
  constructor(private readonly service: StandingsService) {}

  @Get()
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, cId, divisionId)
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger standings recalculation' })
  recalculate(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.recalculate(req.tenantContext.tenantId, cId, divisionId).then(() => ({ ok: true }))
  }
}
