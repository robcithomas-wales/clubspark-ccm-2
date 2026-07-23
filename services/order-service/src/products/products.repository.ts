import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { CreateProductDto } from './dto/create-product.dto.js'
import type { UpdateProductDto } from './dto/update-product.dto.js'
import type { CreatePriceDto } from './dto/create-price.dto.js'

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    opts: { productType?: string; isActive?: boolean; limit?: number; offset?: number },
  ) {
    const where = {
      tenantId,
      ...(opts.productType ? { productType: opts.productType } : {}),
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.read.product.findMany({
        where,
        include: { prices: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: opts.limit ?? 50,
        skip: opts.offset ?? 0,
      }),
      this.prisma.read.product.count({ where }),
    ])
    return { data, total }
  }

  async findById(tenantId: string, id: string) {
    const product = await this.prisma.read.product.findFirst({
      where: { id, tenantId },
      include: { prices: { orderBy: { createdAt: 'asc' } } },
    })
    if (!product) throw new NotFoundException(`Product ${id} not found`)
    return product
  }

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.write.product.create({
      data: {
        tenantId,
        organisationId: dto.organisationId,
        name: dto.name,
        description: dto.description,
        productType: dto.productType,
        isActive: dto.isActive ?? true,
      },
      include: { prices: true },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.findById(tenantId, id)
    return this.prisma.write.product.update({
      where: { id },
      data: dto,
      include: { prices: true },
    })
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    await this.prisma.write.product.delete({ where: { id } })
  }

  // ─── Prices ──────────────────────────────────────────────────────────────────

  async addPrice(tenantId: string, productId: string, dto: CreatePriceDto) {
    await this.findById(tenantId, productId)
    return this.prisma.write.price.create({
      data: {
        tenantId,
        productId,
        amount: dto.amount,
        currency: dto.currency ?? 'GBP',
        memberAmount: dto.memberAmount,
        priceType: dto.priceType ?? 'standard',
        isActive: dto.isActive ?? true,
      },
    })
  }

  async deletePrice(tenantId: string, productId: string, priceId: string) {
    await this.findById(tenantId, productId)
    const price = await this.prisma.read.price.findFirst({ where: { id: priceId, productId, tenantId } })
    if (!price) throw new NotFoundException(`Price ${priceId} not found`)
    await this.prisma.write.price.delete({ where: { id: priceId } })
  }
}
