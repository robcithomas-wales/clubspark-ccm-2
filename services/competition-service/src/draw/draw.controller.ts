import { Controller, Post, Delete, Param, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { DrawService } from './draw.service.js'

@ApiTags('draw')
@Controller('competitions/:competitionId/divisions/:divisionId/draw')
export class DrawController {
  constructor(private readonly service: DrawService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate draw for a division' })
  generate(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') competitionId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.generateDraw(req.tenantContext.tenantId, competitionId, divisionId)
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed confirmed entries by ELO rating (highest ELO = seed 1). Falls back to alphabetical if no ELO config exists.' })
  seedByElo(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') competitionId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.seedEntriesByElo(req.tenantContext.tenantId, competitionId, divisionId)
  }

  @Post('next-round')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate next Swiss round pairings' })
  nextSwissRound(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') competitionId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.generateNextSwissRound(req.tenantContext.tenantId, competitionId, divisionId)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset draw (delete all matches and standings) for a division' })
  reset(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') competitionId: string,
    @Param('divisionId') divisionId: string,
  ) {
    return this.service.resetDraw(req.tenantContext.tenantId, competitionId, divisionId)
  }
}
