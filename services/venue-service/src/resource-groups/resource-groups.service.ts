import { Injectable, NotFoundException } from '@nestjs/common'
import { ResourceGroupsRepository } from './resource-groups.repository'
import { CreateResourceGroupDto } from './dto/create-resource-group.dto'
import { UpdateResourceGroupDto } from './dto/update-resource-group.dto'

@Injectable()
export class ResourceGroupsService {
  constructor(private readonly repo: ResourceGroupsRepository) {}

  async list(tenantId: string, venueId?: string) {
    const groups = await this.repo.findAll(tenantId, venueId)
    return { data: groups }
  }

  async getById(tenantId: string, id: string) {
    const group = await this.repo.findById(tenantId, id)
    if (!group) throw new NotFoundException('Resource group not found')
    return { data: group }
  }

  async create(tenantId: string, dto: CreateResourceGroupDto) {
    const group = await this.repo.create(tenantId, dto)
    return { data: group }
  }

  async update(tenantId: string, id: string, dto: UpdateResourceGroupDto) {
    const group = await this.repo.update(tenantId, id, dto)
    if (!group) throw new NotFoundException('Resource group not found')
    return { data: group }
  }

  async remove(tenantId: string, id: string) {
    const result = await this.repo.delete(tenantId, id)
    if (!result) throw new NotFoundException('Resource group not found')
  }
}
