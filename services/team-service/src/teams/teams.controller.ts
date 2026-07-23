import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { TeamsService } from './teams.service.js'
import { CreateTeamDto } from './dto/create-team.dto.js'
import { UpdateTeamDto } from './dto/update-team.dto.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  // ── Public endpoints (no auth — customer portal) ──────────────────────────

  @Get('public/by-tenant')
  @SkipTenant()
  @ApiOperation({ summary: 'List public teams for a tenant (customer portal)' })
  listPublic(@Query('tenantId') tenantId: string) {
    return this.service.listPublic(tenantId)
  }

  @Get('public/:id')
  @SkipTenant()
  @ApiOperation({ summary: 'Get public team with roster and upcoming fixtures' })
  findOnePublic(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.findByIdPublic(tenantId, id)
  }

  // ── Authenticated endpoints ───────────────────────────────────────────────

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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a team' })
  remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.remove(req.tenantContext.tenantId, id)
  }
}
