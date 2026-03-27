import { NotImplementedException } from '@nestjs/common'
import type {
  PaymentGateway,
  CreatePaymentIntentParams,
  GatewayPaymentIntent,
  GatewayRefundResult,
  NormalisedWebhookEvent,
} from '../gateway.interface.js'

export interface GoCardlessCredentials {
  accessToken: string
  webhookSecret: string
}

// Stub — implement when GoCardless direct debit support is required.
// GoCardless uses a redirect-based flow (mandate creation → payment collection)
// rather than a client-side secret model, so createPaymentIntent returns a
// redirectUrl rather than a clientSecret.
export class GoCardlessGateway implements PaymentGateway {
  constructor(_credentials: GoCardlessCredentials) {}

  async createPaymentIntent(_params: CreatePaymentIntentParams): Promise<GatewayPaymentIntent> {
    throw new NotImplementedException('GoCardless gateway is not yet implemented')
  }

  async cancelPayment(_gatewayRef: string): Promise<void> {
    throw new NotImplementedException('GoCardless gateway is not yet implemented')
  }

  async refund(_gatewayRef: string, _amount?: number): Promise<GatewayRefundResult> {
    throw new NotImplementedException('GoCardless gateway is not yet implemented')
  }

  constructWebhookEvent(_payload: Buffer, _signature: string): NormalisedWebhookEvent {
    throw new NotImplementedException('GoCardless gateway is not yet implemented')
  }
}
