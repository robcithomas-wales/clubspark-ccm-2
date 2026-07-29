import { ForbiddenException, Injectable } from '@nestjs/common'
import { AddOnsRepository } from './add-ons.repository.js'
import type { AttachAddOnDto } from './dto/attach-add-on.dto.js'

@Injectable()
export class AddOnsService {
  constructor(private readonly repo: AddOnsRepository) {}

  async findAll() {
    const addOns = await this.repo.findAll()
    return { data: addOns }
  }

  async findByOrg(organisationId: string, tenantId: string) {
    const addOns = await this.repo.findByOrg(organisationId, tenantId)
    return { data: addOns }
  }

  async attach(tenantId: string, dto: AttachAddOnDto) {
    const existing = await this.repo.findOwner(dto.organisationId, dto.addOnId)
    if (existing && existing.tenantId !== tenantId) {
      throw new ForbiddenException(`Organisation '${dto.organisationId}' does not belong to this tenant`)
    }
    const result = await this.repo.attach(tenantId, dto)
    return { data: result }
  }

  async detach(organisationId: string, addOnId: string, tenantId: string) {
    await this.repo.detach(organisationId, addOnId, tenantId)
    return { data: null }
  }
}
