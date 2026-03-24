import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { TeamsService } from './teams.service.js'
import { CreateTeamDto } from './dto/create-team.dto.js'
import { UpdateTeamDto } from './dto/update-team.dto.js'

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List teams for tenant' })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('sport') sport?: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.service.list(req.tenantContext.tenantId, sport, activeOnly)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateTeamDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }
}
