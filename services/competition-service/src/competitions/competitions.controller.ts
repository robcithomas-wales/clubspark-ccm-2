import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { CompetitionsService } from './competitions.service.js'
import { CreateCompetitionDto } from './dto/create-competition.dto.js'
import { UpdateCompetitionDto } from './dto/update-competition.dto.js'

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly service: CompetitionsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'sport', required: false })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page = 1, @Query('limit') limit = 25,
    @Query('status') status?: string, @Query('sport') sport?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, Number(page), Math.min(Number(limit), 100), { status, sport })
  }

  @Get(':id')
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; organisationId?: string } },
    @Body() dto: CreateCompetitionDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, req.tenantContext.organisationId, dto)
  }

  @Patch(':id')
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string, @Body() dto: UpdateCompetitionDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.delete(req.tenantContext.tenantId, id)
  }
}
