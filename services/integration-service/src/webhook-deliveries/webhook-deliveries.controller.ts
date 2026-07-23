import { Controller, Get, Post, Param, Query, HttpCode, HttpStatus, DefaultValuePipe, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { WebhookDeliveriesService } from './webhook-deliveries.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('webhook-deliveries')
@ApiSecurity('tenant-id')
@Controller({ path: 'webhook-deliveries', version: '1' })
export class WebhookDeliveriesController {
  constructor(private readonly service: WebhookDeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries for a webhook subscription' })
  list(
    @TenantCtx() _ctx: TenantContext,
    @Query('subscriptionId') subscriptionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.listBySubscription(subscriptionId, page, limit)
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-queue a failed or dead delivery' })
  retry(@TenantCtx() _ctx: TenantContext, @Param('id') id: string) {
    return this.service.retry(id)
  }
}
