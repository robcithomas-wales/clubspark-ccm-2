import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger'
import { WebhookSubscriptionsService } from './webhook-subscriptions.service.js'
import { CreateWebhookSubscriptionDto } from './dto/create-webhook-subscription.dto.js'
import { UpdateWebhookSubscriptionDto } from './dto/update-webhook-subscription.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('webhook-subscriptions')
@ApiSecurity('tenant-id')
@Controller({ path: 'webhook-subscriptions', version: '1' })
export class WebhookSubscriptionsController {
  constructor(private readonly service: WebhookSubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a webhook subscription — signing secret returned once only' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateWebhookSubscriptionDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions for the tenant' })
  list(@TenantCtx() ctx: TenantContext) {
    return this.service.list(ctx.tenantId)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a webhook subscription' })
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    return this.service.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id)
  }
}
