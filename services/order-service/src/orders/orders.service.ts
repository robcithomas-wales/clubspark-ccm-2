import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { OrdersRepository } from './orders.repository.js'
import { EventBusService } from '../event-bus/event-bus.service.js'
import type { CreateOrderDto } from './dto/create-order.dto.js'
import type { OrderStatus } from '../generated/prisma/index.js'

const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'cancelled', 'refunded']

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly events: EventBusService,
  ) {}

  async create(tenantId: string, organisationId: string | undefined, dto: CreateOrderDto) {
    const order = await this.repo.create(tenantId, organisationId, dto)

    await this.events.publish({
      type: 'order.created',
      tenantId,
      orderId: order.id,
      subjectType: order.subjectType ?? undefined,
      subjectId: order.subjectId ?? undefined,
      totalAmount: order.totalAmount,
      currency: order.currency,
      occurredAt: new Date().toISOString(),
    })

    return order
  }

  async findById(tenantId: string, id: string) {
    const order = await this.repo.findById(tenantId, id)
    if (!order) throw new NotFoundException(`Order ${id} not found`)
    return order
  }

  async findMany(
    tenantId: string,
    opts: {
      personId?: string
      organisationId?: string
      subjectType?: string
      subjectId?: string
      status?: string
      limit?: number
      offset?: number
    },
  ) {
    return this.repo.findMany(tenantId, opts)
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`)
    }

    const order = await this.repo.findById(tenantId, id)
    if (!order) throw new NotFoundException(`Order ${id} not found`)

    const updated = await this.repo.updateStatus(tenantId, id, status as OrderStatus)

    const eventType =
      status === 'confirmed' ? 'order.confirmed'
      : status === 'cancelled' ? 'order.cancelled'
      : status === 'refunded' ? 'order.refunded'
      : null

    if (eventType) {
      await this.events.publish({
        type: eventType,
        tenantId,
        orderId: updated.id,
        subjectType: updated.subjectType ?? undefined,
        subjectId: updated.subjectId ?? undefined,
        occurredAt: new Date().toISOString(),
      })
    }

    return updated
  }
}
