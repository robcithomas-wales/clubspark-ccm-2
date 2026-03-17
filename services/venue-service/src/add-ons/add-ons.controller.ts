import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiQuery } from '@nestjs/swagger'
import { AddOnsService } from './add-ons.service.js'
import { CreateAddOnDto } from './dto/create-add-on.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('add-ons')
@ApiSecurity('tenant-id')
@Controller('add-ons')
export class AddOnsController {
  constructor(private readonly service: AddOnsService) {}

  @Get()
  @ApiQuery({ name: 'venueId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId?: string,
    @Query('status') status?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    const addOns = await this.service.listAddOns(ctx.tenantId, { venueId, status, resourceType })
    return { data: addOns }
  }

  @Get(':id')
  async getById(@Param('id') id: string, @TenantCtx() ctx: TenantContext) {
    const addOn = await this.service.getAddOnById(ctx.tenantId, id)
    return { data: addOn }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAddOnDto, @TenantCtx() ctx: TenantContext) {
    const addOn = await this.service.createAddOn(ctx.tenantId, dto)
    return { data: addOn }
  }
}
