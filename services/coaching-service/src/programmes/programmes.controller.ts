import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { ProgrammesService } from './programmes.service.js'
import { CreateProgrammeDto } from './dto/create-programme.dto.js'
import { UpdateProgrammeDto } from './dto/update-programme.dto.js'
import { CreateProgrammeSessionDto } from './dto/create-programme-session.dto.js'

type TenantReq = FastifyRequest & { tenantContext: { tenantId: string } }

@ApiTags('programmes')
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly service: ProgrammesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'sport', required: false })
  @ApiQuery({ name: 'coachId', required: false })
  list(
    @Request() req: TenantReq,
    @Query('page') page = 1, @Query('limit') limit = 25,
    @Query('status') status?: string, @Query('sport') sport?: string,
    @Query('coachId') coachId?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, Number(page), Math.min(Number(limit), 100), { status, sport, coachId })
  }

  @Get(':id')
  findOne(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: TenantReq, @Body() dto: CreateProgrammeDto) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  update(@Request() req: TenantReq, @Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft programme (opens enrolment)' })
  publish(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.transition(req.tenantContext.tenantId, id, 'published')
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close enrolment for a published programme' })
  close(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.transition(req.tenantContext.tenantId, id, 'closed')
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'Mark a programme as ended' })
  end(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.transition(req.tenantContext.tenantId, id, 'ended')
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a programme' })
  cancel(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.transition(req.tenantContext.tenantId, id, 'cancelled')
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.delete(req.tenantContext.tenantId, id)
  }

  // Sessions sub-resource
  @Post(':id/sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a session to a programme' })
  addSession(@Request() req: TenantReq, @Param('id') id: string, @Body() dto: CreateProgrammeSessionDto) {
    return this.service.addSession(req.tenantContext.tenantId, id, dto)
  }

  @Patch(':id/sessions/:sessionId')
  updateSession(
    @Request() req: TenantReq,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { status?: string; notes?: string },
  ) {
    return this.service.updateSession(req.tenantContext.tenantId, id, sessionId, body)
  }

  @Delete(':id/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Request() req: TenantReq, @Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.service.deleteSession(req.tenantContext.tenantId, id, sessionId)
  }
}
