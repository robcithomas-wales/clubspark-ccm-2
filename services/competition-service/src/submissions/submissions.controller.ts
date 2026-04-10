import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { SubmissionsService } from './submissions.service.js'
import { CreateSubmissionDto, UpdateSubmissionDto } from './dto/create-submission.dto.js'

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Get()
  @ApiQuery({ name: 'competitionId', required: false })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('competitionId') competitionId?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, competitionId)
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
  @ApiOperation({ summary: 'Submit a competition to a governing body' })
  submit(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.service.submit(req.tenantContext.tenantId, req.tenantContext.adminId, dto)
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Mark a submission as acknowledged by the governing body' })
  acknowledge(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    return this.service.acknowledge(req.tenantContext.tenantId, id, req.tenantContext.adminId, dto)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Mark a submission as rejected' })
  reject(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.service.reject(req.tenantContext.tenantId, id, req.tenantContext.adminId, body.reason)
  }
}
