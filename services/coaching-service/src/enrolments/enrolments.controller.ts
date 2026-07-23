import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { EnrolmentsService } from './enrolments.service.js'
import { CreateEnrolmentDto } from './dto/create-enrolment.dto.js'

type TenantReq = FastifyRequest & { tenantContext: { tenantId: string } }

@ApiTags('enrolments')
@Controller('programmes/:programmeId/enrolments')
export class EnrolmentsController {
  constructor(private readonly service: EnrolmentsService) {}

  @Get()
  list(@Request() req: TenantReq, @Param('programmeId') programmeId: string) {
    return this.service.listForProgramme(req.tenantContext.tenantId, programmeId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enrol a customer into a programme' })
  enrol(@Request() req: TenantReq, @Param('programmeId') programmeId: string, @Body() dto: CreateEnrolmentDto) {
    return this.service.enrol(req.tenantContext.tenantId, programmeId, dto)
  }

  @Delete(':enrolmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an enrolment' })
  cancel(@Request() req: TenantReq, @Param('programmeId') programmeId: string, @Param('enrolmentId') enrolmentId: string) {
    return this.service.cancel(req.tenantContext.tenantId, programmeId, enrolmentId)
  }
}
