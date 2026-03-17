import { Injectable, NotFoundException } from '@nestjs/common'
import { AddOnsRepository, type AddOnFilter } from './add-ons.repository.js'
import type { CreateAddOnDto } from './dto/create-add-on.dto.js'

@Injectable()
export class AddOnsService {
  constructor(private readonly repo: AddOnsRepository) {}

  listAddOns(tenantId: string, filter: AddOnFilter = {}) {
    return this.repo.findAll(tenantId, filter)
  }

  async getAddOnById(tenantId: string, id: string) {
    const addOn = await this.repo.findById(tenantId, id)
    if (!addOn) throw new NotFoundException(`Add-on ${id} not found`)
    return addOn
  }

  createAddOn(tenantId: string, dto: CreateAddOnDto) {
    return this.repo.create(tenantId, dto)
  }
}
