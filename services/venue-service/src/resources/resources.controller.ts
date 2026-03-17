import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { ResourcesService } from './resources.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('resources')
@ApiSecurity('tenant-id')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  async list(@TenantCtx() ctx: TenantContext) {
    const resources = await this.service.listResources(ctx.tenantId)
    return { data: resources }
  }
}
