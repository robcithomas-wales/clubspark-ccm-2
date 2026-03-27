import { Injectable, NotFoundException } from '@nestjs/common'
import { ProviderConfigsRepository } from './provider-configs.repository.js'
import type { UpsertProviderConfigDto } from './dto/upsert-provider-config.dto.js'

@Injectable()
export class ProviderConfigsService {
  constructor(private readonly repo: ProviderConfigsRepository) {}

  async findAll(tenantId: string) {
    const configs = await this.repo.findAllForTenant(tenantId)
    // Never return credential values in list responses
    return { data: configs.map(this.redactCredentials) }
  }

  async upsert(tenantId: string, dto: UpsertProviderConfigDto) {
    const config = await this.repo.upsert(tenantId, dto.provider, dto.currency ?? 'GBP', {
      isDefault: dto.isDefault ?? true,
      credentials: dto.credentials,
    })
    return { data: this.redactCredentials(config) }
  }

  async remove(tenantId: string, id: string) {
    const config = await this.repo.findById(id)
    if (!config || config.tenantId !== tenantId) {
      throw new NotFoundException(`Provider config ${id} not found`)
    }
    const updated = await this.repo.deactivate(tenantId, id)
    return { data: this.redactCredentials(updated) }
  }

  private redactCredentials(config: { credentials: unknown; [key: string]: unknown }) {
    const { credentials: _, ...safe } = config
    return { ...safe, credentials: '[redacted]' }
  }
}
