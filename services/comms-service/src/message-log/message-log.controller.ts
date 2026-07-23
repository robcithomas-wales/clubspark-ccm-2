import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { Tenant, TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { MessageLogRepository } from './message-log.repository.js'

@ApiTags('Message Log')
@Controller({ path: 'message-log', version: '1' })
export class MessageLogController {
  constructor(private readonly repo: MessageLogRepository) {}

  @Get()
  @ApiOperation({ summary: 'List all outbound messages for the tenant' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async list(
    @Tenant() ctx: TenantContext,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const [data, total] = await Promise.all([
      this.repo.findByTenant(ctx.tenantId, limit, offset),
      this.repo.countByTenant(ctx.tenantId),
    ])
    return { data, total, limit, offset }
  }
}
