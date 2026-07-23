import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { SegmentsService } from './segments.service.js'
import { CreateSegmentDto } from './dto/create-segment.dto.js'

@ApiTags('segments')
@Controller('segments')
export class SegmentsController {
  constructor(private readonly service: SegmentsService) {}

  @Get()
  list(@Request() req: FastifyRequest & { tenantContext: { tenantId: string } }) {
    return this.service.list(req.tenantContext.tenantId)
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
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateSegmentDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: Partial<CreateSegmentDto>,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }

  @Get(':id/members')
  listMembers(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.listMembers(req.tenantContext.tenantId, id)
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() body: { personId: string },
  ) {
    return this.service.addMember(req.tenantContext.tenantId, id, body.personId)
  }

  @Delete(':id/members/:personId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Param('personId') personId: string,
  ) {
    return this.service.removeMember(req.tenantContext.tenantId, id, personId)
  }

  @Post(':id/rebuild')
  @HttpCode(HttpStatus.OK)
  rebuild(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.rebuild(req.tenantContext.tenantId, id)
  }
}
