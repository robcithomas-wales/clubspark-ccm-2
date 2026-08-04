import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { ActivitiesService } from './activities.service.js'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'

@ApiTags('activities')
@Controller()
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  /**
   * Inbound domain events from booking-service, membership-service, etc.
   * SECURITY: skips tenant auth (internal event delivery reads tenantId from the
   * body), so it is gated by the shared internal secret via InternalSecretGuard
   * (fail-closed in production).
   */
  @SkipTenant()
  @UseGuards(InternalSecretGuard)
  @ApiSecurity('internal-secret')
  @Post('events/inbound')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inbound(@Body() event: Record<string, unknown>) {
    await this.service.handleInboundEvent(event as any)
  }

  /** List activity timeline for a person. */
  @Get('people/:id/activities')
  async list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.listForPerson(
      req.tenantContext.tenantId,
      id,
      limit ? Number(limit) : undefined,
    )
    return { data }
  }
}
