import { Controller, Get, Put, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AccountingSettingsService } from './accounting-settings.service.js'
import { UpsertAccountingSettingsDto } from './dto/upsert-accounting-settings.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('Accounting Settings')
@Controller('v1/accounting/settings')
export class AccountingSettingsController {
  constructor(private readonly service: AccountingSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get accounting settings for tenant' })
  get(@TenantCtx() ctx: TenantContext) {
    return this.service.get(ctx.tenantId)
  }

  @Put()
  @ApiOperation({ summary: 'Create or update accounting settings' })
  upsert(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertAccountingSettingsDto) {
    return this.service.upsert(ctx.tenantId, dto)
  }

  @Get('account-codes')
  @ApiOperation({ summary: 'List revenue account codes from connected provider' })
  accountCodes(@TenantCtx() ctx: TenantContext) {
    return this.service.getAccountCodes(ctx.tenantId)
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'List tax rates from connected provider' })
  taxRates(@TenantCtx() ctx: TenantContext) {
    return this.service.getTaxRates(ctx.tenantId)
  }
}
