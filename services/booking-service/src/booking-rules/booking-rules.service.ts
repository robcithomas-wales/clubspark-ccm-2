import { Injectable, NotFoundException } from '@nestjs/common'
import { BookingRulesRepository } from './booking-rules.repository.js'
import type { CreateBookingRuleDto } from './dto/create-booking-rule.dto.js'
import type { UpdateBookingRuleDto } from './dto/update-booking-rule.dto.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

@Injectable()
export class BookingRulesService {
  constructor(private readonly repo: BookingRulesRepository) {}

  async list(ctx: TenantContext) {
    return this.repo.findAll(ctx.tenantId)
  }

  async getById(ctx: TenantContext, id: string) {
    const rule = await this.repo.findById(ctx.tenantId, id)
    if (!rule) throw new NotFoundException('Booking rule not found')
    return rule
  }

  async create(ctx: TenantContext, dto: CreateBookingRuleDto) {
    return this.repo.create(ctx.tenantId, dto)
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBookingRuleDto) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Booking rule not found')
    return this.repo.update(ctx.tenantId, id, dto)
  }

  async delete(ctx: TenantContext, id: string) {
    const existing = await this.repo.findById(ctx.tenantId, id)
    if (!existing) throw new NotFoundException('Booking rule not found')
    await this.repo.delete(ctx.tenantId, id)
  }
}
