import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { DisciplineService } from './discipline.service.js'
import { CreateDisciplineCaseDto } from './dto/create-case.dto.js'
import { UpdateDisciplineCaseDto } from './dto/update-case.dto.js'
import { CreateDisciplineActionDto } from './dto/create-action.dto.js'

@ApiTags('discipline')
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly service: DisciplineService) {}

  @Get()
  @ApiQuery({ name: 'competitionId', required: false })
  @ApiQuery({ name: 'personId', required: false })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('competitionId') competitionId?: string,
    @Query('personId') personId?: string,
  ) {
    return this.service.listCases(req.tenantContext.tenantId, competitionId, personId)
  }

  @Get(':id')
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.getCase(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Body() dto: CreateDisciplineCaseDto,
  ) {
    return this.service.createCase(req.tenantContext.tenantId, req.tenantContext.adminId, dto)
  }

  @Patch(':id')
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('id') id: string,
    @Body() dto: UpdateDisciplineCaseDto,
  ) {
    return this.service.updateCase(req.tenantContext.tenantId, id, req.tenantContext.adminId, dto)
  }

  @Post(':id/actions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a disciplinary action to a case' })
  addAction(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('id') id: string,
    @Body() dto: CreateDisciplineActionDto,
  ) {
    return this.service.addAction(req.tenantContext.tenantId, id, req.tenantContext.adminId, dto)
  }
}
