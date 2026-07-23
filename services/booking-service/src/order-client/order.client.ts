import { Injectable, Logger } from '@nestjs/common'

export interface CreateOrderPayload {
  tenantId: string
  organisationId?: string
  personId?: string
  subjectType: string
  subjectId: string
  idempotencyKey: string
  currency?: string
  items: Array<{
    productType: string
    description: string
    unitAmount: number
    quantity?: number
  }>
}

export interface OrderResponse {
  id: string
  status: string
  totalAmount: number
}

/**
 * HTTP client for order-service.
 * PILOT: direct HTTP call.
 * PRODUCTION: replace with Azure Service Bus message or gRPC if latency requires it.
 */
@Injectable()
export class OrderClient {
  private readonly logger = new Logger(OrderClient.name)
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:4015'
  }

  async createOrder(
    payload: CreateOrderPayload,
  ): Promise<OrderResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': payload.tenantId,
          ...(payload.organisationId ? { 'x-organisation-id': payload.organisationId } : {}),
        },
        body: JSON.stringify({
          personId: payload.personId,
          subjectType: payload.subjectType,
          subjectId: payload.subjectId,
          idempotencyKey: payload.idempotencyKey,
          currency: payload.currency ?? 'GBP',
          items: payload.items,
        }),
      })

      if (!res.ok) {
        this.logger.warn(`order-service returned ${res.status} for booking ${payload.subjectId}`)
        return null
      }

      return res.json() as Promise<OrderResponse>
    } catch (err) {
      // Non-fatal: order creation failure must not block booking creation during pilot
      this.logger.error(`Failed to create order for booking ${payload.subjectId}: ${String(err)}`)
      return null
    }
  }
}
