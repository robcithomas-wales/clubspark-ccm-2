import Stripe from 'stripe'
import { BadRequestException, Logger } from '@nestjs/common'
import type {
  PaymentGateway,
  CreatePaymentIntentParams,
  GatewayPaymentIntent,
  GatewayRefundResult,
  NormalisedWebhookEvent,
} from '../gateway.interface.js'

export interface StripeCredentials {
  secretKey: string
  webhookSecret: string
  publishableKey?: string
}

export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe
  private readonly logger = new Logger(StripeGateway.name)

  constructor(private readonly credentials: StripeCredentials) {
    this.stripe = new Stripe(credentials.secretKey)
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<GatewayPaymentIntent> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        metadata: params.metadata ?? {},
      },
      { idempotencyKey: params.idempotencyKey },
    )

    return {
      gatewayRef: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: intent.status,
    }
  }

  async cancelPayment(gatewayRef: string): Promise<void> {
    await this.stripe.paymentIntents.cancel(gatewayRef)
  }

  async refund(gatewayRef: string, amount?: number): Promise<GatewayRefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: gatewayRef,
      ...(amount !== undefined ? { amount } : {}),
    })

    return {
      gatewayRef: refund.id,
      status: refund.status ?? 'unknown',
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): NormalisedWebhookEvent {
    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.credentials.webhookSecret,
      )
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`)
      throw new BadRequestException('Invalid webhook signature')
    }

    const type = this.normaliseEventType(event.type)

    // Extract the gateway ref from the event object
    const obj = event.data.object as Stripe.PaymentIntent | Stripe.Charge | Stripe.Refund
    const gatewayRef = this.extractGatewayRef(event.type, obj)

    return {
      type,
      gatewayRef,
      gatewayEventId: event.id,
      rawEvent: event,
    }
  }

  private normaliseEventType(stripeType: string): NormalisedWebhookEvent['type'] {
    switch (stripeType) {
      case 'payment_intent.succeeded':
        return 'payment.succeeded'
      case 'payment_intent.payment_failed':
        return 'payment.failed'
      case 'charge.refunded':
        return 'payment.refunded'
      default:
        return 'unknown'
    }
  }

  private extractGatewayRef(
    eventType: string,
    obj: Stripe.PaymentIntent | Stripe.Charge | Stripe.Refund,
  ): string {
    if (eventType.startsWith('payment_intent.')) {
      return (obj as Stripe.PaymentIntent).id
    }
    if (eventType === 'charge.refunded') {
      const charge = obj as Stripe.Charge
      return typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.id
    }
    return (obj as { id: string }).id
  }
}
