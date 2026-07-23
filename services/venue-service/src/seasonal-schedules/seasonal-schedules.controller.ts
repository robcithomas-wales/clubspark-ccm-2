import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import { SeasonalSchedulesService } from './seasonal-schedules.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

class CreateDto {
  @IsString() @IsNotEmpty() venueId!: string
  @IsString() @IsNotEmpty() name!: string
  @IsString() @IsNotEmpty() startDate!: string
  @IsString() @IsNotEmpty() endDate!: string
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsString() notes?: string
}

class UpdateDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() startDate?: string
  @IsOptional() @IsString() endDate?: string
  @IsOptional() @IsString() status?: string
  @IsOptional() @IsString() notes?: string
}

@ApiTags('seasonal-schedules')
@ApiSecurity('tenant-id')
@Controller('seasonal-schedules')
export class SeasonalSchedulesController {
  constructor(private readonly svc: SeasonalSchedulesService) {}

  @Get()
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.svc.list(ctx.tenantId, venueId, status)
    return { data }
  }

  @Get(':id')
  async getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const data = await this.svc.getById(ctx.tenantId, id)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateDto) {
    const data = await this.svc.create(ctx.tenantId, dto)
    return { data }
  }

  @Patch(':id')
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateDto,
  ) {
    const data = await this.svc.update(ctx.tenantId, id, dto)
    return { data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.svc.remove(ctx.tenantId, id)
  }
}
