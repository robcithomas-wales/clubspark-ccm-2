import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateCustomerDto } from './dto/create-customer.dto.js'
import type { UpdateCustomerDto } from './dto/update-customer.dto.js'

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit

    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ])

    return { customers, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { tenantId, id },
    })
  }

  async findByEmail(tenantId: string, email: string) {
    return this.prisma.customer.findFirst({
      where: { tenantId, email },
    })
  }

  async rehome(tenantId: string, oldId: string, newId: string) {
    // Update the customer ID and cascade to bookings + memberships across schemas.
    // FK checks are disabled for this transaction to avoid ordering constraints.
    await this.prisma.$transaction([
      this.prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
      this.prisma.$executeRaw`
        UPDATE booking.bookings
        SET customer_id = ${newId}::uuid
        WHERE customer_id = ${oldId}::uuid
          AND tenant_id = ${tenantId}::uuid
      `,
      this.prisma.$executeRaw`
        UPDATE membership.memberships
        SET customer_id = ${newId}::uuid
        WHERE customer_id = ${oldId}::uuid
          AND tenant_id = ${tenantId}::uuid
      `,
      this.prisma.$executeRaw`
        UPDATE customer.customers
        SET id = ${newId}::uuid
        WHERE id = ${oldId}::uuid
          AND tenant_id = ${tenantId}::uuid
      `,
    ])
    return this.prisma.customer.findFirst({ where: { tenantId, id: newId } })
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const data: Record<string, unknown> = {}
    if (dto.firstName !== undefined) data.firstName = dto.firstName
    if (dto.lastName !== undefined) data.lastName = dto.lastName
    if (dto.email !== undefined) data.email = dto.email ?? null
    if (dto.phone !== undefined) data.phone = dto.phone ?? null
    if (dto.marketingConsent !== undefined) {
      data.marketingConsent = dto.marketingConsent
      data.consentRecordedAt = new Date()
    }
    return this.prisma.customer.updateMany({
      where: { tenantId, id },
      data,
    })
  }
}
