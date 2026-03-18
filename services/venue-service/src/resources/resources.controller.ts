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
import { ResourcesService } from './resources.service.js'
import { CreateResourceDto } from './dto/create-resource.dto.js'
import { UpdateResourceDto } from './dto/update-resource.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('resources')
@ApiSecurity('tenant-id')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('venueId') venueId?: string,
    @Query('groupId') groupId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === undefined ? undefined : isActive === 'true'
    return this.service.list(ctx.tenantId, venueId, groupId, activeFilter)
  }

  @Get(':id')
  getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.getById(ctx.tenantId, id)
  }

  @Post()
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateResourceDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.delete(ctx.tenantId, id)
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.service.update(ctx.tenantId, id, dto)
  }
}
