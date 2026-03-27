import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { RankingsService } from './rankings.service.js'
import { CreateRankingConfigDto } from './dto/create-ranking-config.dto.js'
import { UpdateRankingConfigDto } from './dto/update-ranking-config.dto.js'

function tenantId(req: FastifyRequest & { tenantContext?: { tenantId: string } }): string {
  return req.tenantContext?.tenantId ?? (req.headers as any)['x-tenant-id'] as string
}

@ApiTags('rankings')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly service: RankingsService) {}

  // ── Configs ────────────────────────────────────────────────────────────────

  @Post('configs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a ranking config' })
  createConfig(@Request() req: FastifyRequest, @Body() dto: CreateRankingConfigDto) {
    return this.service.createConfig(tenantId(req), dto)
  }

  @Get('configs')
  listConfigs(@Request() req: FastifyRequest, @Query('sport') sport?: string) {
    return this.service.listConfigs(tenantId(req), sport)
  }

  @Get('configs/:id')
  getConfig(@Request() req: FastifyRequest, @Param('id') id: string) {
    return this.service.getConfig(tenantId(req), id)
  }

  @Patch('configs/:id')
  updateConfig(@Request() req: FastifyRequest, @Param('id') id: string, @Body() dto: UpdateRankingConfigDto) {
    return this.service.updateConfig(tenantId(req), id, dto)
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConfig(@Request() req: FastifyRequest, @Param('id') id: string) {
    return this.service.deleteConfig(tenantId(req), id)
  }

  // ── Leaderboard ────────────────────────────────────────────────────────────

  @Get(':configId')
  @ApiOperation({ summary: 'Get ranked leaderboard for a config' })
  getLeaderboard(
    @Request() req: FastifyRequest,
    @Param('configId') configId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.getLeaderboard(tenantId(req), configId, limit ? Number(limit) : 50, offset ? Number(offset) : 0)
  }

  @Get(':configId/entries/:entryId/history')
  getEntryHistory(
    @Request() req: FastifyRequest,
    @Param('configId') configId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.service.getEntryHistory(tenantId(req), configId, entryId)
  }

  @Post(':configId/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full recalculation from match events (admin)' })
  recalculate(@Request() req: FastifyRequest, @Param('configId') configId: string) {
    return this.service.recalculateFromScratch(tenantId(req), configId)
  }
}
