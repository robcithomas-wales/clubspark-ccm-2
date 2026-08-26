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
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { OrganisationsService } from './organisations.service.js'
import { CreateOrganisationDto } from './dto/create-organisation.dto.js'
import { UpdateOrganisationDto } from './dto/update-organisation.dto.js'
import { InternalSecretGuard } from '@clubspark/auth'
import {
  StaffAttributionInterceptor,
  type InternalContext,
} from '../staff-attribution.interceptor.js'
import { AuditService } from '../audit/audit.service.js'

type InternalReq = FastifyRequest & { internalContext: InternalContext }

@ApiTags('internal/organisations')
@UseGuards(InternalSecretGuard)
@UseInterceptors(StaffAttributionInterceptor)
@Controller({ path: 'internal/organisations', version: '1' })
export class OrganisationsController {
  constructor(
    private readonly service: OrganisationsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all organisations (cross-tenant)' })
  async list(
    @Request() req: InternalReq,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('region') region?: string,
  ) {
    const result = await this.service.list(Number(page), Number(limit), {
      search,
      status,
      plan,
      region,
    })
    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    }
  }

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get organisation detail and health indicators' })
  async getDetail(@Request() req: InternalReq, @Param('tenantId') tenantId: string) {
    const data = await this.service.getDetail(tenantId)
    void this.audit.log(
      req.internalContext,
      tenantId,
      'organisation.viewed',
      'organisation',
      tenantId,
    )
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new organisation in the internal registry' })
  async create(@Request() req: InternalReq, @Body() dto: CreateOrganisationDto) {
    const data = await this.service.create(dto)
    void this.audit.log(
      req.internalContext,
      dto.tenantId,
      'organisation.created',
      'organisation',
      data.id,
      { name: dto.name },
    )
    return { data }
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upsert org profile from venue-service (name/slug/email only, preserves plan/status)',
  })
  async sync(@Body() dto: CreateOrganisationDto) {
    const data = await this.service.sync(dto)
    return { data }
  }

  @Patch(':tenantId')
  @ApiOperation({ summary: 'Update organisation details (plan, status, etc.)' })
  async update(
    @Request() req: InternalReq,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateOrganisationDto,
  ) {
    const data = await this.service.update(tenantId, dto)
    void this.audit.log(
      req.internalContext,
      tenantId,
      'organisation.updated',
      'organisation',
      tenantId,
      dto as Record<string, unknown>,
    )
    return { data }
  }
}
