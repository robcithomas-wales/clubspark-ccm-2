import { Injectable, NotFoundException } from '@nestjs/common'
import { ResourcesRepository } from './resources.repository.js'
import { CreateResourceDto } from './dto/create-resource.dto.js'
import { UpdateResourceDto } from './dto/update-resource.dto.js'

@Injectable()
export class ResourcesService {
  constructor(private readonly repo: ResourcesRepository) {}

  async list(tenantId: string, venueId?: string, groupId?: string, isActive?: boolean) {
    const resources = await this.repo.findAll(tenantId, venueId, groupId, isActive)
    return { data: resources }
  }

  // Keep old name for any callers that haven't been updated
  listResources(tenantId: string) {
    return this.repo.findAll(tenantId)
  }

  async getById(tenantId: string, id: string) {
    const resource = await this.repo.findById(tenantId, id)
    if (!resource) throw new NotFoundException('Resource not found')
    return { data: resource }
  }

  async create(tenantId: string, dto: CreateResourceDto) {
    const resource = await this.repo.create(tenantId, dto)
    return { data: resource }
  }

  async delete(tenantId: string, id: string) {
    const result = await this.repo.delete(tenantId, id)
    if (!result) throw new NotFoundException('Resource not found')
  }

  async update(tenantId: string, id: string, dto: UpdateResourceDto) {
    const resource = await this.repo.update(tenantId, id, dto)
    if (!resource) throw new NotFoundException('Resource not found')
    return { data: resource }
  }
}
