import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service.js'
import { encryptToken } from '../common/crypto/token-encryption.js'
import type { ProviderConfig } from '../generated/prisma/index.js'
import type { AppConfig } from '../config/configuration.js'

@Injectable()
export class ProviderConfigsRepository {
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.encryptionKey = this.config.get('tokenEncryptionKey', { infer: true })
  }

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

    // Encrypt credential values at rest (AES-256-GCM). Decrypted only when a
    // gateway client is built (see GatewayFactory).
    const encryptedData = {
      ...data,
      credentials: Object.fromEntries(
        Object.entries(data.credentials).map(([key, value]) => [
          key,
          encryptToken(value, this.encryptionKey),
        ]),
      ),
    }

    return this.prisma.write.providerConfig.upsert({
      where: { tenantId_provider_currency: { tenantId, provider, currency } },
      create: { tenantId, provider, currency, ...encryptedData },
      update: encryptedData,
    })
  }

  async deactivate(tenantId: string, id: string): Promise<ProviderConfig> {
    return this.prisma.write.providerConfig.update({
      where: { id, tenantId },
      data: { isActive: false },
    })
  }
}
