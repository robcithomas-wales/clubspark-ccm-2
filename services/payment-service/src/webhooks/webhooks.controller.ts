import { Controller, Post, Param, Req, Headers, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { WebhooksService } from './webhooks.service.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'

// Webhook endpoints are called by external gateways, not by our frontend.
// They are excluded from auth (@SkipTenant) and use the tenantId path param
// to look up the correct provider config and verify the gateway signature.
@ApiTags('webhooks')
@SkipTenant()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('stripe/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async stripeWebhook(
    @Param('tenantId') tenantId: string,
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body))
    await this.service.handleStripe(tenantId, rawBody, signature)
    return { received: true }
  }

  @Post('gocardless/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async goCardlessWebhook(
    @Param('tenantId') tenantId: string,
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('webhook-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body))
    await this.service.handleGoCardless(tenantId, rawBody, signature)
    return { received: true }
  }
}
