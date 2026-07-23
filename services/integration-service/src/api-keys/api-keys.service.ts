import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes } from 'crypto'
import { ApiKeysRepository } from './api-keys.repository.js'
import type { CreateApiKeyDto } from './dto/create-api-key.dto.js'
import type { AppConfig } from '../config/configuration.js'

@Injectable()
export class ApiKeysService {
  private readonly hashSecret: string

  constructor(
    private readonly repo: ApiKeysRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    this.hashSecret = config.get('apiKeyHashSecret', { infer: true })
  }

  async create(tenantId: string, dto: CreateApiKeyDto) {
    const plaintext = `cs_${randomBytes(32).toString('hex')}`
    const keyHash = createHmac('sha256', this.hashSecret).update(plaintext).digest('hex')

    const key = await this.repo.create({
      tenantId,
      name: dto.name,
      keyHash,
      scopes: dto.scopes,
    })

    return {
      id: key.id,
      name: key.name,
      scopes: key.scopes,
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
      plaintext,
    }
  }

  async list(tenantId: string) {
    const keys = await this.repo.findAllByTenant(tenantId)
    return {
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        scopes: k.scopes,
        isActive: k.isActive,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt,
        requestCount: k.requestCount,
      })),
    }
  }

  async suspend(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await this.repo.setActive(tenantId, id, false)
    return { success: true }
  }

  async activate(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await this.repo.setActive(tenantId, id, true)
    return { success: true }
  }

  async revoke(tenantId: string, id: string) {
    await this.assertExists(tenantId, id)
    await this.repo.revoke(tenantId, id)
    return { success: true }
  }

  async usage(tenantId: string, id: string, page = 1, limit = 50) {
    await this.assertExists(tenantId, id)
    const { data, total } = await this.repo.findUsage(id, page, limit)
    return {
      data: data.map((u) => ({
        id: u.id,
        endpoint: u.endpoint,
        responseCode: u.responseCode,
        timestamp: u.timestamp.toISOString(),
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  private async assertExists(tenantId: string, id: string) {
    const key = await this.repo.findById(tenantId, id)
    if (!key) throw new NotFoundException(`API key ${id} not found`)
  }
}
