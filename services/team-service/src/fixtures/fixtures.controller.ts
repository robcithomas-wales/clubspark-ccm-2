import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { FixturesService } from './fixtures.service.js'
import { CreateFixtureDto } from './dto/create-fixture.dto.js'
import { UpdateFixtureDto } from './dto/update-fixture.dto.js'

@ApiTags('fixtures')
@Controller('teams/:teamId/fixtures')
export class FixturesController {
  constructor(private readonly service: FixturesService) {}

  @Get()
  @ApiOperation({ summary: 'List fixtures for a team' })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: boolean,
  ) {
    return this.service.list(req.tenantContext.tenantId, teamId, status, upcoming)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fixture by ID (full detail)' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, teamId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fixture' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Body() dto: CreateFixtureDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, teamId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fixture (including status)' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFixtureDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, teamId, id, dto)
  }
}
