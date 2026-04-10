import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { WorkCardsService } from './work-cards.service.js'
import { UpsertWorkCardDto } from './dto/upsert-work-card.dto.js'

@ApiTags('work-cards')
@Controller('work-cards')
export class WorkCardsController {
  constructor(private readonly service: WorkCardsService) {}

  @Get()
  @ApiQuery({ name: 'sport', required: false })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('sport') sport?: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, sport)
  }

  @Get('person/:personId')
  @ApiQuery({ name: 'sport', required: false })
  listForPerson(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('personId') personId: string,
    @Query('sport') sport?: string,
  ) {
    return this.service.listForPerson(req.tenantContext.tenantId, personId, sport)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  upsert(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Body() dto: UpsertWorkCardDto,
  ) {
    return this.service.upsert(req.tenantContext.tenantId, req.tenantContext.adminId, dto)
  }

  @Delete('person/:personId/:sport')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; adminId?: string } },
    @Param('personId') personId: string,
    @Param('sport') sport: string,
  ) {
    return this.service.delete(req.tenantContext.tenantId, req.tenantContext.adminId, personId, sport)
  }
}
