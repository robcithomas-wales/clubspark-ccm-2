import { Injectable } from '@nestjs/common'
import { ProductsRepository } from './products.repository.js'
import type { CreateProductDto } from './dto/create-product.dto.js'
import type { UpdateProductDto } from './dto/update-product.dto.js'
import type { CreatePriceDto } from './dto/create-price.dto.js'

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  list(
    tenantId: string,
    page: number,
    limit: number,
    opts: { productType?: string; isActive?: boolean },
  ) {
    return this.repo.findMany(tenantId, { ...opts, limit, offset: (page - 1) * limit })
  }

  getById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id)
  }

  create(tenantId: string, dto: CreateProductDto) {
    return this.repo.create(tenantId, dto)
  }

  update(tenantId: string, id: string, dto: UpdateProductDto) {
    return this.repo.update(tenantId, id, dto)
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete(tenantId, id)
  }

  addPrice(tenantId: string, productId: string, dto: CreatePriceDto) {
    return this.repo.addPrice(tenantId, productId, dto)
  }

  removePrice(tenantId: string, productId: string, priceId: string) {
    return this.repo.deletePrice(tenantId, productId, priceId)
  }
}
