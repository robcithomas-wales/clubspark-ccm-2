import { Injectable } from '@nestjs/common'
import { AddOnsRepository } from './add-ons.repository.js'
import type { AttachAddOnDto } from './dto/attach-add-on.dto.js'

@Injectable()
export class AddOnsService {
  constructor(private readonly repo: AddOnsRepository) {}

  async findAll() {
    const addOns = await this.repo.findAll()
    return { data: addOns }
  }

  async findByOrg(organisationId: string) {
    const addOns = await this.repo.findByOrg(organisationId)
    return { data: addOns }
  }

  async attach(tenantId: string, dto: AttachAddOnDto) {
    const result = await this.repo.attach(tenantId, dto)
    return { data: result }
  }

  async detach(organisationId: string, addOnId: string) {
    await this.repo.detach(organisationId, addOnId)
    return { data: null }
  }
}
