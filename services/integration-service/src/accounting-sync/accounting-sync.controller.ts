import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AccountingSyncService } from './accounting-sync.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('Accounting Sync')
@Controller('v1/accounting/sync-log')
export class AccountingSyncController {
  constructor(private readonly service: AccountingSyncService) {}

  @Get()
  @ApiOperation({ summary: 'List accounting sync log entries for tenant' })
  list(
    @TenantCtx() ctx: TenantContext,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.listSyncLog(ctx.tenantId, page, limit)
  }
}
