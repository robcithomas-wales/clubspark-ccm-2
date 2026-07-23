import { Injectable, NotFoundException } from '@nestjs/common'
import { RefundPoliciesRepository, CreateRefundPolicyDto, UpdateRefundPolicyDto } from './refund-policies.repository.js'

@Injectable()
export class RefundPoliciesService {
  constructor(private readonly repo: RefundPoliciesRepository) {}

  async list(tenantId: string) {
    return this.repo.findAll(tenantId)
  }

  async getById(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id)
    if (!row) throw new NotFoundException(`Refund policy ${id} not found`)
    return row
  }

  async create(tenantId: string, dto: CreateRefundPolicyDto) {
    return this.repo.create(tenantId, dto)
  }

  async update(tenantId: string, id: string, dto: UpdateRefundPolicyDto) {
    const row = await this.repo.update(tenantId, id, dto)
    if (!row) throw new NotFoundException(`Refund policy ${id} not found`)
    return row
  }

  async delete(tenantId: string, id: string) {
    const deleted = await this.repo.delete(tenantId, id)
    if (!deleted) throw new NotFoundException(`Refund policy ${id} not found`)
  }
}
