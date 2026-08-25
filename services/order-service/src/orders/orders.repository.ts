import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { Order, OrderItem, OrderStatus, Prisma } from '../generated/prisma/index.js'
import type { CreateOrderDto } from './dto/create-order.dto.js'

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    organisationId: string | undefined,
    dto: CreateOrderDto,
    withinTx: (
      tx: Prisma.TransactionClient,
      order: Order & { items: OrderItem[] },
    ) => Promise<void>,
  ): Promise<Order & { items: OrderItem[] }> {
    const currency = dto.currency ?? 'GBP'
    const items = dto.items.map((item) => ({
      tenantId,
      productType: item.productType,
      productId: item.productId,
      description: item.description,
      unitAmount: item.unitAmount,
      quantity: item.quantity ?? 1,
      totalAmount: item.unitAmount * (item.quantity ?? 1),
      metadata: item.metadata as Prisma.InputJsonValue | undefined,
    }))

    const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)

    try {
      return await this.prisma.write.$transaction(async (tx) => {
        // Returning an existing idempotent order must not emit order.created again.
        if (dto.idempotencyKey) {
          const existing = await tx.order.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
            include: { items: true },
          })
          if (existing) {
            if (existing.tenantId !== tenantId) {
              throw new ConflictException('Idempotency key conflict')
            }
            return existing
          }
        }

        const order = await tx.order.create({
          data: {
            tenantId,
            organisationId,
            personId: dto.personId,
            currency,
            totalAmount,
            subjectType: dto.subjectType,
            subjectId: dto.subjectId,
            idempotencyKey: dto.idempotencyKey,
            metadata: dto.metadata as Prisma.InputJsonValue | undefined,
            items: { create: items },
          },
          include: { items: true },
        })
        await withinTx(tx, order)
        return order
      })
    } catch (err) {
      // Two concurrent requests can both miss the initial read. The unique key
      // chooses one winner; the loser returns that committed order and must not
      // enqueue a second order.created event.
      if (dto.idempotencyKey && (err as { code?: string }).code === 'P2002') {
        const existing = await this.prisma.write.order.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: { items: true },
        })
        if (existing) {
          if (existing.tenantId !== tenantId) {
            throw new ConflictException('Idempotency key conflict')
          }
          return existing
        }
      }
      throw err
    }
  }

  async findById(tenantId: string, id: string): Promise<(Order & { items: OrderItem[] }) | null> {
    return this.prisma.read.order.findFirst({
      where: { id, tenantId },
      include: { items: true },
    })
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
  ): Promise<{ data: (Order & { items: OrderItem[] })[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(opts.personId ? { personId: opts.personId } : {}),
      ...(opts.organisationId ? { organisationId: opts.organisationId } : {}),
      ...(opts.subjectType ? { subjectType: opts.subjectType } : {}),
      ...(opts.subjectId ? { subjectId: opts.subjectId } : {}),
      ...(opts.status ? { status: opts.status as OrderStatus } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.read.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: opts.limit ?? 50,
        skip: opts.offset ?? 0,
      }),
      this.prisma.read.order.count({ where }),
    ])

    return { data, total }
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: OrderStatus,
    withinTx: (
      tx: Prisma.TransactionClient,
      order: Order & { items: OrderItem[] },
    ) => Promise<void>,
  ): Promise<Order & { items: OrderItem[] }> {
    return this.prisma.write.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id, tenantId },
        data: { status },
        include: { items: true },
      })
      await withinTx(tx, order)
      return order
    })
  }
}
