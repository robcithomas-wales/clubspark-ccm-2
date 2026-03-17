import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateAddOnDto } from './dto/create-add-on.dto.js'
import { Prisma } from '../generated/prisma/index.js'

export interface AddOnFilter {
  venueId?: string
  status?: string
  resourceType?: string
}

@Injectable()
export class AddOnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, filter: AddOnFilter = {}) {
    const where: Prisma.AddOnWhereInput = { tenantId }

    if (filter.venueId) where.venueId = filter.venueId
    if (filter.status) where.status = filter.status
    if (filter.resourceType) {
      where.allowedResourceTypes = { has: filter.resourceType }
    }

    return this.prisma.read.addOn.findMany({
      where,
      orderBy: { name: 'asc' },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.addOn.findFirst({
      where: { tenantId, id },
    })
  }

  create(tenantId: string, dto: CreateAddOnDto) {
    return this.prisma.write.addOn.create({
      data: {
        tenantId,
        venueId: dto.venueId ?? null,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        category: dto.category,
        status: dto.status ?? 'active',
        pricingType: dto.pricingType ?? 'fixed',
        price: dto.price ?? 0,
        currency: dto.currency ?? 'GBP',
        inventoryMode: dto.inventoryMode ?? 'unlimited',
        totalInventory: dto.totalInventory ?? null,
        allowedResourceTypes: dto.allowedResourceTypes ?? [],
      },
    })
  }
}
