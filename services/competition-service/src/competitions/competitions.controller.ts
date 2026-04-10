import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { CompetitionsService } from './competitions.service.js'
import { CreateCompetitionDto } from './dto/create-competition.dto.js'
import { UpdateCompetitionDto } from './dto/update-competition.dto.js'

type TenantReq = FastifyRequest & { tenantContext: { tenantId: string; organisationId?: string; adminId?: string } }

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly service: CompetitionsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'sport', required: false })
  list(
    @Request() req: TenantReq,
    @Query('page') page = 1, @Query('limit') limit = 25,
    @Query('status') status?: string, @Query('sport') sport?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, Number(page), Math.min(Number(limit), 100), { status, sport })
  }

  @Get(':id')
  findOne(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get audit log for a competition' })
  auditLog(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.getAuditLog(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: TenantReq, @Body() dto: CreateCompetitionDto) {
    return this.service.create(req.tenantContext.tenantId, req.tenantContext.organisationId, req.tenantContext.adminId, dto)
  }

  @Post(':id/submit-for-approval')
  @ApiOperation({ summary: 'Submit a DRAFT competition for approval' })
  submitForApproval(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.submitForApproval(req.tenantContext.tenantId, id, req.tenantContext.adminId)
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a competition (moves to REGISTRATION_OPEN)' })
  approve(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.approve(req.tenantContext.tenantId, id, req.tenantContext.adminId)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a competition (returns to DRAFT with reason)' })
  reject(@Request() req: TenantReq, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.reject(req.tenantContext.tenantId, id, req.tenantContext.adminId, body.reason)
  }

  @Patch(':id')
  update(@Request() req: TenantReq, @Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.service.update(req.tenantContext.tenantId, id, req.tenantContext.adminId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: TenantReq, @Param('id') id: string) {
    return this.service.delete(req.tenantContext.tenantId, id, req.tenantContext.adminId)
  }
}
