import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { SessionsService } from './sessions.service.js'
import { CreateSessionDto } from './dto/create-session.dto.js'
import { UpdateSessionDto } from './dto/update-session.dto.js'

@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get()
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('coachId') coachId?: string,
    @Query('lessonTypeId') lessonTypeId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.list(tenantId, {
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 25, 100),
      coachId,
      lessonTypeId,
      customerId,
      status,
      fromDate,
      toDate,
    })
  }

  @Get(':id')
  findById(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.findById(tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateSessionDto,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    const { tenantId } = req.tenantContext
    return this.service.delete(tenantId, id)
  }
}
