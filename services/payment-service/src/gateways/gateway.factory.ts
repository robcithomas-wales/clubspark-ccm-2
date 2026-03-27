import { Injectable, BadRequestException } from '@nestjs/common'
import type { PaymentGateway } from './gateway.interface.js'
import { StripeGateway } from './stripe/stripe.gateway.js'
import { GoCardlessGateway } from './gocardless/gocardless.gateway.js'

@Injectable()
export class GatewayFactory {
  create(provider: string, credentials: Record<string, string>): PaymentGateway {
    switch (provider) {
      case 'stripe':
        if (!credentials['secretKey'] || !credentials['webhookSecret']) {
          throw new BadRequestException(
            'Stripe provider config requires secretKey and webhookSecret',
          )
        }
        return new StripeGateway({
          secretKey: credentials['secretKey'],
          webhookSecret: credentials['webhookSecret'],
          publishableKey: credentials['publishableKey'],
        })

      case 'gocardless':
        if (!credentials['accessToken'] || !credentials['webhookSecret']) {
          throw new BadRequestException(
            'GoCardless provider config requires accessToken and webhookSecret',
          )
        }
        return new GoCardlessGateway({
          accessToken: credentials['accessToken'],
          webhookSecret: credentials['webhookSecret'],
        })

      default:
        throw new BadRequestException(`Unsupported payment provider: ${provider}`)
    }
  }
}
