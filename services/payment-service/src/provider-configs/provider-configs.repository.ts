import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { ProviderConfig } from '../generated/prisma/index.js'

@Injectable()
export class ProviderConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProviderConfig | null> {
    return this.prisma.read.providerConfig.findUnique({ where: { id } })
  }

  async findDefault(tenantId: string, currency = 'GBP'): Promise<ProviderConfig | null> {
    return this.prisma.read.providerConfig.findFirst({
      where: { tenantId, currency, isDefault: true, isActive: true },
    })
  }

  async findByProvider(
    tenantId: string,
    provider: string,
    currency = 'GBP',
  ): Promise<ProviderConfig | null> {
    return this.prisma.read.providerConfig.findFirst({
      where: { tenantId, provider, currency, isActive: true },
    })
  }

  async findAllForTenant(tenantId: string): Promise<ProviderConfig[]> {
    return this.prisma.read.providerConfig.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async upsert(
    tenantId: string,
    provider: string,
    currency: string,
    data: {
      isDefault: boolean
      credentials: Record<string, string>
    },
  ): Promise<ProviderConfig> {
    // If this config is being set as default, clear existing default for this currency
    if (data.isDefault) {
      await this.prisma.write.providerConfig.updateMany({
        where: { tenantId, currency, isDefault: true },
        data: { isDefault: false },
      })
    }

    return this.prisma.write.providerConfig.upsert({
      where: { tenantId_provider_currency: { tenantId, provider, currency } },
      create: { tenantId, provider, currency, ...data },
      update: data,
    })
  }

  async deactivate(tenantId: string, id: string): Promise<ProviderConfig> {
    return this.prisma.write.providerConfig.update({
      where: { id, tenantId },
      data: { isActive: false },
    })
  }
}
