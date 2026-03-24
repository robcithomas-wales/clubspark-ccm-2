import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { LessonTypesService } from './lesson-types.service.js'
import { CreateLessonTypeDto } from './dto/create-lesson-type.dto.js'
import { UpdateLessonTypeDto } from './dto/update-lesson-type.dto.js'

@ApiTags('lesson-types')
@Controller('lesson-types')
export class LessonTypesController {
  constructor(private readonly service: LessonTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List lesson types (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sport', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('sport') sport?: string,
    @Query('activeOnly') activeOnly?: boolean,
  ) {
    const safeLimit = Math.min(Number(limit), 100)
    return this.service.list(req.tenantContext.tenantId, Number(page), safeLimit, sport, activeOnly)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson type by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lesson type' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateLessonTypeDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a lesson type' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateLessonTypeDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }
}
