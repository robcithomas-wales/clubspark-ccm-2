import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { OrdersService } from './orders.service.js'
import { CreateOrderDto } from './dto/create-order.dto.js'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js'

interface TenantRequest extends FastifyRequest {
  tenantContext: { tenantId: string; organisationId?: string }
}

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an order with line items' })
  create(@Request() req: TenantRequest, @Body() dto: CreateOrderDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findById(@Request() req: TenantRequest, @Param('id') id: string) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Get()
  @ApiOperation({ summary: 'List orders for this tenant' })
  @ApiQuery({ name: 'personId', required: false })
  @ApiQuery({ name: 'subjectType', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findMany(
    @Request() req: TenantRequest,
    @Query('personId') personId?: string,
    @Query('subjectType') subjectType?: string,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.findMany(tenantId, {
      personId,
      organisationId,
      subjectType,
      subjectId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    })
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (confirmed, cancelled, refunded)' })
  updateStatus(
    @Request() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(req.tenantContext.tenantId, id, dto.status)
  }
}
