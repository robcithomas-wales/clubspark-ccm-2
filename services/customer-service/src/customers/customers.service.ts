import { Injectable, NotFoundException } from '@nestjs/common'
import { CustomersRepository } from './customers.repository.js'
import type { CreateCustomerDto } from './dto/create-customer.dto.js'

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  async list(tenantId: string, page: number, limit: number, search?: string) {
    const { customers, total } = await this.repo.list(tenantId, page, limit, search)
    return {
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.repo.findById(tenantId, id)
    if (!customer) throw new NotFoundException('Customer not found')
    return { data: customer }
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    // If a Supabase user ID is provided, check whether this email already exists.
    // If it does, rehome the existing record to the new ID so everything stays linked.
    if (dto.id && dto.email) {
      const existing = await this.repo.findByEmail(tenantId, dto.email)
      if (existing && existing.id !== dto.id) {
        const customer = await this.repo.rehome(tenantId, existing.id, dto.id)
        return { data: customer }
      }
      if (existing) {
        return { data: existing }
      }
    }
    const customer = await this.repo.create(tenantId, dto)
    return { data: customer }
  }
}
