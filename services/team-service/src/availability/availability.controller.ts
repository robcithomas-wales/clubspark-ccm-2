import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { AvailabilityService } from './availability.service.js'
import { RespondAvailabilityDto } from './dto/respond-availability.dto.js'

@ApiTags('availability')
@Controller('teams/:teamId/fixtures/:fixtureId/availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get availability dashboard for a fixture' })
  getForFixture(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('fixtureId') fixtureId: string,
  ) {
    return this.service.getForFixture(req.tenantContext.tenantId, fixtureId)
  }

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send availability request to all active roster members' })
  requestAll(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
  ) {
    return this.service.requestAll(req.tenantContext.tenantId, fixtureId, teamId)
  }

  @Post(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit or update a player availability response' })
  respond(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('fixtureId') fixtureId: string,
    @Param('memberId') memberId: string,
    @Body() dto: RespondAvailabilityDto,
  ) {
    return this.service.respond(req.tenantContext.tenantId, fixtureId, memberId, dto.response, dto.notes)
  }
}
