import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common'
import { GatewayFactory } from '../gateways/gateway.factory.js'
import { ProviderConfigsRepository } from '../provider-configs/provider-configs.repository.js'
import { PaymentsRepository } from './payments.repository.js'
import type { CreatePaymentDto } from './dto/create-payment.dto.js'
import type { RefundPaymentDto } from './dto/refund-payment.dto.js'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly providerConfigsRepo: ProviderConfigsRepository,
    private readonly gatewayFactory: GatewayFactory,
  ) {}

  async create(tenantId: string, dto: CreatePaymentDto) {
    // Idempotency check — return existing payment if this key was already used
    const existing = await this.repo.findByIdempotencyKey(dto.idempotencyKey)
    if (existing) {
      this.logger.log(`Idempotency hit for key ${dto.idempotencyKey} — returning existing payment`)
      return existing
    }

    const providerConfig = await this.providerConfigsRepo.findDefault(tenantId, dto.currency ?? 'GBP')
    if (!providerConfig) {
      throw new NotFoundException(`No active payment provider configured for tenant ${tenantId}`)
    }

    const payment = await this.repo.create({
      tenantId,
      idempotencyKey: dto.idempotencyKey,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      customerId: dto.customerId,
      providerConfigId: providerConfig.id,
      amount: dto.amount,
      currency: dto.currency ?? 'GBP',
      metadata: dto.metadata,
    })

    const gateway = this.gatewayFactory.create(
      providerConfig.provider,
      providerConfig.credentials as Record<string, string>,
    )

    let intent
    try {
      intent = await gateway.createPaymentIntent({
        amount: dto.amount,
        currency: dto.currency ?? 'GBP',
        idempotencyKey: dto.idempotencyKey,
        metadata: dto.metadata,
      })
    } catch (err) {
      await this.repo.createAttempt({
        paymentId: payment.id,
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      await this.repo.updateStatus(payment.id, 'failed', {
        failureReason: err instanceof Error ? err.message : 'Gateway error',
      })
      throw err
    }

    await this.repo.createAttempt({
      paymentId: payment.id,
      gatewayRef: intent.gatewayRef,
      status: intent.status,
    })

    const updated = await this.repo.updateStatus(payment.id, 'requires_action', {
      gatewayRef: intent.gatewayRef,
    })

    return {
      ...updated,
      clientSecret: intent.clientSecret,
      redirectUrl: intent.redirectUrl,
    }
  }

  async findAll(
    tenantId: string,
    page?: number,
    limit?: number,
    subjectType?: string,
    subjectId?: string,
  ) {
    const safePage = Number.isFinite(page) && (page as number) >= 1 ? (page as number) : 1
    const safeLimit = Number.isFinite(limit) && (limit as number) >= 1 ? Math.min(limit as number, 100) : 25
    const { data, total } = await this.repo.findAll(tenantId, { page: safePage, limit: safeLimit, subjectType, subjectId })
    return {
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    }
  }

  async findOne(tenantId: string, id: string) {
    const payment = await this.repo.findById(id)
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException(`Payment ${id} not found`)
    }
    return { data: payment }
  }

  async refund(tenantId: string, id: string, dto: RefundPaymentDto) {
    const payment = await this.repo.findById(id)
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException(`Payment ${id} not found`)
    }
    if (payment.status !== 'succeeded') {
      throw new ConflictException(`Cannot refund a payment with status '${payment.status}'`)
    }

    const providerConfig = await this.providerConfigsRepo.findById(payment.providerConfigId)
    if (!providerConfig) {
      throw new NotFoundException('Provider config not found for this payment')
    }

    const refund = await this.repo.createRefund({
      paymentId: payment.id,
      amount: dto.amount,
      currency: payment.currency,
      reason: dto.reason,
    })

    const gateway = this.gatewayFactory.create(
      providerConfig.provider,
      providerConfig.credentials as Record<string, string>,
    )

    let result
    try {
      result = await gateway.refund(payment.gatewayRef!, dto.amount)
    } catch (err) {
      await this.repo.updateRefundStatus(refund.id, 'failed')
      throw err
    }

    const updated = await this.repo.updateRefundStatus(refund.id, 'succeeded', result.gatewayRef)
    return { data: updated }
  }
}
