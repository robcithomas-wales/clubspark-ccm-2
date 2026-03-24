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
import { CoachesService } from './coaches.service.js'
import { CreateCoachDto } from './dto/create-coach.dto.js'
import { UpdateCoachDto } from './dto/update-coach.dto.js'

@ApiTags('coaches')
@Controller('coaches')
export class CoachesController {
  constructor(private readonly service: CoachesService) {}

  @Get()
  @ApiOperation({ summary: 'List coaches (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('activeOnly') activeOnly = true,
  ) {
    const safeLimit = Math.min(Number(limit), 100)
    return this.service.list(req.tenantContext.tenantId, Number(page), safeLimit, Boolean(activeOnly))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coach by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coach' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateCoachDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a coach' })
  update(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCoachDto,
  ) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }
}
