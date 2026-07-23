import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class OAuthConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    tenantId: string
    provider: string
    providerTenantId: string | null
    accessToken: string
    refreshToken: string
    tokenExpiry: Date
    scopes: string[]
  }) {
    return this.prisma.write.oAuthConnection.upsert({
      where: { tenantId_provider: { tenantId: data.tenantId, provider: data.provider } },
      create: {
        tenantId: data.tenantId,
        provider: data.provider,
        providerTenantId: data.providerTenantId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry,
        scopes: data.scopes,
        disconnectedAt: null,
      },
      update: {
        providerTenantId: data.providerTenantId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry,
        scopes: data.scopes,
        disconnectedAt: null,
      },
    })
  }

  async findByTenant(tenantId: string) {
    return this.prisma.read.oAuthConnection.findMany({
      where: { tenantId, disconnectedAt: null },
      orderBy: { connectedAt: 'desc' },
    })
  }

  async findByTenantAndProvider(tenantId: string, provider: string) {
    return this.prisma.read.oAuthConnection.findFirst({
      where: { tenantId, provider, disconnectedAt: null },
    })
  }

  async findById(id: string) {
    return this.prisma.read.oAuthConnection.findUnique({ where: { id } })
  }

  async disconnect(tenantId: string, provider: string) {
    return this.prisma.write.oAuthConnection.update({
      where: { tenantId_provider: { tenantId, provider } },
      data: { disconnectedAt: new Date() },
    })
  }

  async updateTokens(id: string, data: { accessToken: string; refreshToken: string; tokenExpiry: Date }) {
    return this.prisma.write.oAuthConnection.update({ where: { id }, data })
  }
}
