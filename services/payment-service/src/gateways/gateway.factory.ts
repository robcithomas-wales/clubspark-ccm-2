import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PaymentGateway } from './gateway.interface.js'
import { StripeGateway } from './stripe/stripe.gateway.js'
import { GoCardlessGateway } from './gocardless/gocardless.gateway.js'
import { decryptToken } from '../common/crypto/token-encryption.js'
import type { AppConfig } from '../config/configuration.js'

@Injectable()
export class GatewayFactory {
  private readonly encryptionKey: string

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.encryptionKey = this.config.get('tokenEncryptionKey', { infer: true })
  }

  create(provider: string, encryptedCredentials: Record<string, string>): PaymentGateway {
    // Credentials are stored encrypted at rest — decrypt just before use.
    const credentials = Object.fromEntries(
      Object.entries(encryptedCredentials).map(([key, value]) => [
        key,
        decryptToken(value, this.encryptionKey),
      ]),
    )

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
