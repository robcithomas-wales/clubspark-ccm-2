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
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { BlackoutDatesService } from './blackout-dates.service.js'
import { CreateBlackoutDateDto } from './dto/create-blackout-date.dto.js'
import { UpdateBlackoutDateDto } from './dto/update-blackout-date.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('blackout-dates')
@ApiSecurity('tenant-id')
@Controller('blackout-dates')
export class BlackoutDatesController {
  constructor(private readonly service: BlackoutDatesService) {}

  @Get()
  async list(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    const data = await this.service.list(ctx.tenantId, venueId, resourceId)
    return { data }
  }

  @Get(':id')
  async getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const data = await this.service.getById(ctx.tenantId, id)
    return { data }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBlackoutDateDto) {
    const data = await this.service.create(ctx.tenantId, dto)
    return { data }
  }

  @Patch(':id')
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBlackoutDateDto,
  ) {
    const data = await this.service.update(ctx.tenantId, id, dto)
    return { data }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.service.remove(ctx.tenantId, id)
  }
}
