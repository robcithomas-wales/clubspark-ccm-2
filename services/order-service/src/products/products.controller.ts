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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { ProductsService } from './products.service.js'
import { CreateProductDto } from './dto/create-product.dto.js'
import { UpdateProductDto } from './dto/update-product.dto.js'
import { CreatePriceDto } from './dto/create-price.dto.js'

interface TenantRequest extends FastifyRequest {
  tenantContext: { tenantId: string; organisationId?: string }
}

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productType', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async list(
    @Request() req: TenantRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('productType') productType?: string,
    @Query('isActive') isActive?: string,
  ) {
    const result = await this.service.list(
      req.tenantContext.tenantId,
      Number(page),
      Number(limit),
      {
        productType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      },
    )
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async getById(@Request() req: TenantRequest, @Param('id') id: string) {
    const data = await this.service.getById(req.tenantContext.tenantId, id)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product' })
  async create(@Request() req: TenantRequest, @Body() dto: CreateProductDto) {
    const data = await this.service.create(req.tenantContext.tenantId, dto)
    return { data }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @Request() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.service.update(req.tenantContext.tenantId, id, dto)
    return { data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  async remove(@Request() req: TenantRequest, @Param('id') id: string) {
    await this.service.remove(req.tenantContext.tenantId, id)
  }

  // ─── Prices ──────────────────────────────────────────────────────────────────

  @Post(':id/prices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a price to a product' })
  async addPrice(
    @Request() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: CreatePriceDto,
  ) {
    const data = await this.service.addPrice(req.tenantContext.tenantId, id, dto)
    return { data }
  }

  @Delete(':id/prices/:priceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a price from a product' })
  async removePrice(
    @Request() req: TenantRequest,
    @Param('id') id: string,
    @Param('priceId') priceId: string,
  ) {
    await this.service.removePrice(req.tenantContext.tenantId, id, priceId)
  }
}
