import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { CustomersService } from './customers.service.js'
import { CreateCustomerDto } from './dto/create-customer.dto.js'

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 25,
    @Query('search') search?: string,
  ) {
    const safeLimit = Math.min(Number(limit), 100)
    return this.service.list(req.tenantContext.tenantId, Number(page), safeLimit, search)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.service.findById(req.tenantContext.tenantId, id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }
}
