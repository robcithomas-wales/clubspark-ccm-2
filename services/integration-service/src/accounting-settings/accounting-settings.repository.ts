import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AccountingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.read.accountingSettings.findUnique({ where: { tenantId } })
  }

  async upsert(data: {
    tenantId: string
    provider: string
    revenueAccountCode: string
    taxRateId?: string | null
    invoiceMode?: string
    currencyCode?: string
  }) {
    return this.prisma.write.accountingSettings.upsert({
      where: { tenantId: data.tenantId },
      create: {
        tenantId: data.tenantId,
        provider: data.provider,
        revenueAccountCode: data.revenueAccountCode,
        taxRateId: data.taxRateId ?? null,
        invoiceMode: data.invoiceMode ?? 'AUTHORISED',
        currencyCode: data.currencyCode ?? 'GBP',
      },
      update: {
        provider: data.provider,
        revenueAccountCode: data.revenueAccountCode,
        taxRateId: data.taxRateId ?? null,
        invoiceMode: data.invoiceMode ?? 'AUTHORISED',
        currencyCode: data.currencyCode ?? 'GBP',
      },
    })
  }
}
