import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateCustomerDto } from './dto/create-customer.dto.js'

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

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
      },
    })
  }
}
