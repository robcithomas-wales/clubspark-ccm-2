import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CustomersRepository } from './customers.repository.js'
import type { CreateCustomerDto } from './dto/create-customer.dto.js'
import type { UpdateCustomerDto } from './dto/update-customer.dto.js'
import type { AppConfig } from '../config/configuration.js'

const TENANT_HEADER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

@Injectable()
export class CustomersService {
  private readonly bookingServiceUrl: string
  private readonly membershipServiceUrl: string

  constructor(
    private readonly repo: CustomersRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.bookingServiceUrl = config.get('bookingService', { infer: true }).url
    this.membershipServiceUrl = config.get('membershipService', { infer: true }).url
  }

  async list(tenantId: string, page: number, limit: number, search?: string, lifecycle?: string) {
    const { customers, total } = await this.repo.list(tenantId, page, limit, search, lifecycle)
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

  async bulkImport(tenantId: string, rows: CreateCustomerDto[]) {
    const results = { created: 0, skipped: 0, errors: 0 }
    for (const row of rows) {
      try {
        if (row.email) {
          const existing = await this.repo.findByEmail(tenantId, row.email)
          if (existing) { results.skipped++; continue }
        }
        await this.repo.create(tenantId, row)
        results.created++
      } catch {
        results.errors++
      }
    }
    return results
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Customer not found')
    await this.repo.update(tenantId, id, dto)
    return this.findById(tenantId, id)
  }

  async getFinancialProfile(tenantId: string, personId: string) {
    const customer = await this.repo.findById(tenantId, personId)
    if (!customer) throw new NotFoundException('Customer not found')

    const headers = { 'x-tenant-id': tenantId, 'Content-Type': 'application/json' }

    // Fetch booking stats for this customer (all statuses, no pagination needed for aggregation)
    let lifetimeSpend = 0
    let unpaidCount = 0
    let bookingCount = 0
    try {
      const bRes = await fetch(
        `${this.bookingServiceUrl}/v1/bookings?customerId=${personId}&limit=200`,
        { headers },
      )
      if (bRes.ok) {
        const bJson = await bRes.json() as { data?: { price?: number | null; paymentStatus?: string; status?: string }[] }
        const bookings = bJson.data ?? []
        bookingCount = bookings.filter((b) => b.status !== 'cancelled').length
        for (const b of bookings) {
          if (b.status === 'cancelled') continue
          if (b.price != null) lifetimeSpend += Number(b.price)
          if (b.paymentStatus === 'unpaid') unpaidCount++
        }
      }
    } catch { /* non-fatal */ }

    // Fetch active membership (if any)
    let activeMembership: { planName: string; status: string; expiresAt?: string } | null = null
    try {
      const mRes = await fetch(
        `${this.membershipServiceUrl}/v1/memberships?customerId=${personId}&status=active&limit=1`,
        { headers },
      )
      if (mRes.ok) {
        const mJson = await mRes.json() as { data?: { planName?: string; status?: string; expiresAt?: string }[] }
        const first = mJson.data?.[0]
        if (first) {
          activeMembership = {
            planName: first.planName ?? 'Unknown plan',
            status: first.status ?? 'active',
            expiresAt: first.expiresAt,
          }
        }
      }
    } catch { /* non-fatal */ }

    return {
      data: {
        personId,
        lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
        currency: 'GBP',
        bookingCount,
        unpaidBookings: unpaidCount,
        activeMembership,
      },
    }
  }
}
