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
import { ResourceGroupsService } from './resource-groups.service'
import { CreateResourceGroupDto } from './dto/create-resource-group.dto'
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Controller('resource-groups')
export class ResourceGroupsController {
  constructor(private readonly service: ResourceGroupsService) {}

  @Get()
  list(@TenantCtx() ctx: TenantContext, @Query('venueId') venueId?: string) {
    return this.service.list(ctx.tenantId, venueId)
  }

  @Get(':id')
  getById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.getById(ctx.tenantId, id)
  }

  @Post()
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateResourceGroupDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateResourceGroupDto,
  ) {
    return this.service.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    await this.service.remove(ctx.tenantId, id)
  }
}
