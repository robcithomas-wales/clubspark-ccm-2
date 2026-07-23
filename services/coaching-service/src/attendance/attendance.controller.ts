import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { AttendanceService } from './attendance.service.js'
import { MarkAttendanceDto } from './dto/mark-attendance.dto.js'

type TenantReq = FastifyRequest & { tenantContext: { tenantId: string } }

@ApiTags('attendance')
@Controller('programmes/:programmeId/sessions/:sessionId/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get attendance records for a programme session' })
  list(@Request() req: TenantReq, @Param('programmeId') programmeId: string, @Param('sessionId') sessionId: string) {
    return this.service.listForSession(req.tenantContext.tenantId, programmeId, sessionId)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark or update attendance for an enrolment in a session' })
  mark(
    @Request() req: TenantReq,
    @Param('programmeId') programmeId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.service.mark(req.tenantContext.tenantId, programmeId, sessionId, dto)
  }
}
