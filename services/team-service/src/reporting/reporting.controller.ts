import { Controller, Get, Query, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { ReportingService } from './reporting.service.js'

@ApiTags('reporting')
@Controller('reporting')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Cross-team overview: player counts, upcoming fixtures, outstanding fees' })
  overview(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
  ) {
    return this.service.getOverview(req.tenantContext.tenantId)
  }

  @Get('fixtures')
  @ApiOperation({ summary: 'All fixtures across all teams with scores and result' })
  fixtures(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('season') season?: string,
  ) {
    return this.service.getFixtures(req.tenantContext.tenantId, season)
  }

  @Get('charges')
  @ApiOperation({ summary: 'All charges across all teams with player and fixture context' })
  charges(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('season') season?: string,
  ) {
    return this.service.getCharges(req.tenantContext.tenantId, season)
  }

  @Get('player-stats')
  @ApiOperation({ summary: 'Availability and selection stats per player, optionally filtered to one team' })
  playerStats(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('teamId') teamId?: string,
  ) {
    return this.service.getPlayerStats(req.tenantContext.tenantId, teamId)
  }

  @Get('website-readiness')
  @ApiOperation({ summary: 'Team website readiness: public status, fixtures URL, photo completion, portal URL' })
  websiteReadiness(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
  ) {
    return this.service.getWebsiteReadiness(req.tenantContext.tenantId)
  }

  @Get('squad-composition')
  @ApiOperation({ summary: 'Squad composition: role split, profile completeness per team' })
  squadComposition(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
  ) {
    return this.service.getSquadComposition(req.tenantContext.tenantId)
  }
}
