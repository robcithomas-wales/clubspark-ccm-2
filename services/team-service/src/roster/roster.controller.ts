import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { RosterService } from './roster.service.js'
import { CreateMemberDto } from './dto/create-member.dto.js'
import { UpdateMemberDto } from './dto/update-member.dto.js'

@ApiTags('roster')
@Controller('teams/:teamId/roster')
export class RosterController {
  constructor(private readonly service: RosterService) {}

  @Get()
  @ApiOperation({ summary: 'List team roster' })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    return this.service.list(req.tenantContext.tenantId, teamId, activeOnly)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team member by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, teamId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add player to roster' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, teamId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team member' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, teamId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove player from roster (soft delete)' })
  remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(req.tenantContext.tenantId, teamId, id)
  }
}
