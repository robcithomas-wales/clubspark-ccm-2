import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { Payment, Refund, PaymentStatus } from '../generated/prisma/index.js'

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.read.payment.findUnique({ where: { id } })
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.prisma.read.payment.findUnique({ where: { idempotencyKey: key } })
  }

  async findByGatewayRef(gatewayRef: string): Promise<Payment | null> {
    return this.prisma.read.payment.findFirst({ where: { gatewayRef } })
  }

  async findAll(
    tenantId: string,
    opts: { page: number; limit: number; subjectType?: string; subjectId?: string },
  ): Promise<{ data: Payment[]; total: number }> {
    const where = {
      tenantId,
      ...(opts.subjectType ? { subjectType: opts.subjectType } : {}),
      ...(opts.subjectId ? { subjectId: opts.subjectId } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.read.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        include: { refunds: true },
      }),
      this.prisma.read.payment.count({ where }),
    ])
    return { data, total }
  }

  async create(data: {
    tenantId: string
    idempotencyKey: string
    subjectType: string
    subjectId: string
    customerId?: string
    providerConfigId: string
    amount: number
    currency: string
    metadata?: Record<string, string>
  }): Promise<Payment> {
    return this.prisma.write.payment.create({ data })
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    opts?: { gatewayRef?: string; failureReason?: string },
  ): Promise<Payment> {
    return this.prisma.write.payment.update({
      where: { id },
      data: {
        status,
        ...(opts?.gatewayRef ? { gatewayRef: opts.gatewayRef } : {}),
        ...(opts?.failureReason ? { failureReason: opts.failureReason } : {}),
      },
    })
  }

  async createAttempt(data: {
    paymentId: string
    gatewayRef?: string
    status: string
    errorCode?: string
    errorMessage?: string
  }) {
    return this.prisma.write.paymentAttempt.create({ data })
  }

  async createRefund(data: {
    paymentId: string
    amount?: number
    currency: string
    gatewayRef?: string
    reason?: string
  }): Promise<Refund> {
    return this.prisma.write.refund.create({ data })
  }

  async updateRefundStatus(
    id: string,
    status: 'pending' | 'succeeded' | 'failed',
    gatewayRef?: string,
  ): Promise<Refund> {
    return this.prisma.write.refund.update({
      where: { id },
      data: { status, ...(gatewayRef ? { gatewayRef } : {}) },
    })
  }
}
