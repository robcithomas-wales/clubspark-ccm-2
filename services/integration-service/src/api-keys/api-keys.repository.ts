import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { ApiKey, ApiKeyUsage } from '../generated/prisma/index.js'

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenantId: string
    name: string
    keyHash: string
    scopes: string[]
  }): Promise<ApiKey> {
    return this.prisma.write.apiKey.create({ data })
  }

  async findAllByTenant(tenantId: string): Promise<
    (ApiKey & { lastUsedAt: string | null; requestCount: number })[]
  > {
    const keys = await this.prisma.read.apiKey.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        usage: { orderBy: { timestamp: 'desc' }, take: 1, select: { timestamp: true } },
        _count: { select: { usage: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return keys.map((k) => ({
      ...k,
      lastUsedAt: k.usage[0]?.timestamp?.toISOString() ?? null,
      requestCount: k._count.usage,
    }))
  }

  async findById(tenantId: string, id: string): Promise<ApiKey | null> {
    return this.prisma.read.apiKey.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.read.apiKey.findFirst({
      where: { keyHash, isActive: true, deletedAt: null },
    })
  }

  async setActive(tenantId: string, id: string, isActive: boolean): Promise<ApiKey> {
    return this.prisma.write.apiKey.update({
      where: { id },
      data: { isActive },
    })
  }

  async revoke(tenantId: string, id: string): Promise<void> {
    await this.prisma.write.apiKey.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  async findUsage(
    apiKeyId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ApiKeyUsage[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.read.apiKeyUsage.findMany({
        where: { apiKeyId },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.read.apiKeyUsage.count({ where: { apiKeyId } }),
    ])
    return { data, total }
  }
}
