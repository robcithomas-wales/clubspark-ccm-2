import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { EntriesService } from './entries.service.js'
import { CreateEntryDto } from './dto/create-entry.dto.js'
import { UpdateEntryDto } from './dto/update-entry.dto.js'

@ApiTags('entries')
@Controller('competitions/:competitionId/entries')
export class EntriesController {
  constructor(private readonly service: EntriesService) {}

  @Get()
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Query('divisionId') divisionId?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, cId, divisionId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, cId, dto)
  }

  @Patch(':id')
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, cId, id, dto)
  }

  @Post('bulk-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm all pending entries in a division' })
  bulkConfirm(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Query('divisionId') divisionId: string,
  ) {
    return this.service.bulkConfirm(req.tenantContext.tenantId, cId, divisionId)
  }
}
