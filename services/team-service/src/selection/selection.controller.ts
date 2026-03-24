import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { SelectionService } from './selection.service.js'
import { SetSelectionDto } from './dto/set-selection.dto.js'

@ApiTags('selection')
@Controller('teams/:teamId/fixtures/:fixtureId/selection')
export class SelectionController {
  constructor(private readonly service: SelectionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current selection for a fixture' })
  getForFixture(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
  ) {
    return this.service.getForFixture(req.tenantContext.tenantId, teamId, fixtureId)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the full squad selection for a fixture' })
  setSelection(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
    @Body() dto: SetSelectionDto,
  ) {
    return this.service.setSelection(req.tenantContext.tenantId, teamId, fixtureId, dto)
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish selection (notifies players)' })
  publish(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
  ) {
    return this.service.publish(req.tenantContext.tenantId, teamId, fixtureId)
  }
}
