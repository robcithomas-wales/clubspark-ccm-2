// The contract every payment gateway implementation must satisfy.
// Adding a new provider = implement this interface + register in GatewayFactory.

export interface CreatePaymentIntentParams {
  /** Amount in smallest currency unit (pence for GBP, cents for USD) */
  amount: number
  currency: string
  /** Stable caller-supplied key — same key always returns the same gateway intent */
  idempotencyKey: string
  metadata?: Record<string, string>
}

export interface GatewayPaymentIntent {
  /** Gateway's own reference (e.g. Stripe PaymentIntent ID) */
  gatewayRef: string
  /** For client-side confirmation via Stripe Elements or similar */
  clientSecret?: string
  /** For redirect-based gateways (GoCardless, WorldPay hosted page) */
  redirectUrl?: string
  status: string
}

export interface GatewayRefundResult {
  gatewayRef: string
  status: string
}

export interface NormalisedWebhookEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'unknown'
  /** Gateway ref of the payment this event relates to */
  gatewayRef: string
  /** Gateway's own event ID — used for deduplication */
  gatewayEventId: string
  rawEvent: unknown
}

export interface PaymentGateway {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<GatewayPaymentIntent>
  cancelPayment(gatewayRef: string): Promise<void>
  /** Pass amountPence for partial refund; omit for full refund */
  refund(gatewayRef: string, amount?: number): Promise<GatewayRefundResult>
  /** Must be called with the raw request body buffer, not the parsed JSON */
  constructWebhookEvent(payload: Buffer, signature: string): NormalisedWebhookEvent
}
