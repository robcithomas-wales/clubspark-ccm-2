import { Injectable, Logger } from '@nestjs/common'

interface OrderItemPayload {
  productType: string
  description: string
  unitAmount: number
  quantity: number
}

interface CreateOrderPayload {
  tenantId: string
  subjectType: string
  subjectId: string
  currency?: string
  items: OrderItemPayload[]
  idempotencyKey?: string
}

@Injectable()
export class OrderClient {
  private readonly logger = new Logger(OrderClient.name)
  private readonly baseUrl = process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:4015'

  async createOrder(payload: CreateOrderPayload): Promise<{ id: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        this.logger.warn(`Order creation failed: ${res.status}`)
        return null
      }
      const body = await res.json() as { data: { id: string } }
      return body.data
    } catch (err) {
      this.logger.warn(`Order service unreachable: ${(err as Error).message}`)
      return null
    }
  }
}
