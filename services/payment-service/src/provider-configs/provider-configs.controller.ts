import { Controller, Get, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { ProviderConfigsService } from './provider-configs.service.js'
import { UpsertProviderConfigDto } from './dto/upsert-provider-config.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('provider-configs')
@ApiSecurity('tenant-id')
@Controller('provider-configs')
export class ProviderConfigsController {
  constructor(private readonly service: ProviderConfigsService) {}

  @Get()
  findAll(@TenantCtx() ctx: TenantContext) {
    return this.service.findAll(ctx.tenantId)
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  upsert(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertProviderConfigDto) {
    return this.service.upsert(ctx.tenantId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id)
  }
}
