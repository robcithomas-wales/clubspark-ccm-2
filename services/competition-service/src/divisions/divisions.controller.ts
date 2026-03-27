import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { DivisionsService } from './divisions.service.js'
import { CreateDivisionDto } from './dto/create-division.dto.js'

@ApiTags('divisions')
@Controller('competitions/:competitionId/divisions')
export class DivisionsController {
  constructor(private readonly service: DivisionsService) {}

  @Get()
  list(@Param('competitionId') competitionId: string) { return this.service.list(competitionId) }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('competitionId') competitionId: string, @Body() dto: CreateDivisionDto) {
    return this.service.create(competitionId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('competitionId') competitionId: string, @Param('id') id: string) {
    return this.service.delete(competitionId, id)
  }
}
