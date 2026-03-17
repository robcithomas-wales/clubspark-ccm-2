import { Injectable } from '@nestjs/common'
import { ResourcesRepository } from './resources.repository.js'

@Injectable()
export class ResourcesService {
  constructor(private readonly repo: ResourcesRepository) {}

  listResources(tenantId: string) {
    return this.repo.findAll(tenantId)
  }
}
