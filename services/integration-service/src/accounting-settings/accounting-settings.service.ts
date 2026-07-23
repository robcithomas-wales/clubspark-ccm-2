import { Injectable, NotFoundException } from '@nestjs/common'
import { AccountingSettingsRepository } from './accounting-settings.repository.js'
import { OAuthConnectionsService } from '../oauth-connections/oauth-connections.service.js'
import { XeroClientService } from '../accounting/xero-client.service.js'
import { QuickBooksClientService } from '../accounting/quickbooks-client.service.js'
import type { UpsertAccountingSettingsDto } from './dto/upsert-accounting-settings.dto.js'

@Injectable()
export class AccountingSettingsService {
  constructor(
    private readonly repo: AccountingSettingsRepository,
    private readonly connections: OAuthConnectionsService,
    private readonly xero: XeroClientService,
    private readonly qb: QuickBooksClientService,
  ) {}

  async get(tenantId: string) {
    const settings = await this.repo.findByTenant(tenantId)
    if (!settings) return null
    return {
      provider: settings.provider,
      revenueAccountCode: settings.revenueAccountCode,
      taxRateId: settings.taxRateId,
      invoiceMode: settings.invoiceMode,
      currencyCode: settings.currencyCode,
    }
  }

  async upsert(tenantId: string, dto: UpsertAccountingSettingsDto) {
    await this.repo.upsert({ tenantId, ...dto })
    return this.get(tenantId)
  }

  async getAccountCodes(tenantId: string) {
    const settings = await this.repo.findByTenant(tenantId)
    const provider = settings?.provider
    const token = await this.connections.getActiveToken(tenantId, provider ?? 'xero')
    if (!token) throw new NotFoundException('No active accounting connection')

    if (provider === 'xero') {
      return this.xero.getAccountCodes(token.accessToken, token.realmId!)
    }
    return this.qb.getAccountCodes(token.accessToken, token.realmId!)
  }

  async getTaxRates(tenantId: string) {
    const settings = await this.repo.findByTenant(tenantId)
    const provider = settings?.provider
    const token = await this.connections.getActiveToken(tenantId, provider ?? 'xero')
    if (!token) throw new NotFoundException('No active accounting connection')

    if (provider === 'xero') {
      return this.xero.getTaxRates(token.accessToken, token.realmId!)
    }
    return this.qb.getTaxCodes(token.accessToken, token.realmId!)
  }
}
