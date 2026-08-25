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
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { ActivitiesService } from './activities.service.js'
import { SkipTenant } from '@clubspark/auth'
import { InternalSecretGuard } from '@clubspark/auth'
import { EventInboxService, type InboxOutcome } from './event-inbox.service.js'

/**
 * Turn an inbox outcome into the answer the producer needs.
 *
 * A refused claim must NOT be acknowledged: the relay marks the outbox row
 * published on any 2xx, so acking "busy" drops the event entirely.
 */
function ackOrRetry(outcome: InboxOutcome, type: string): void {
  if (outcome === 'processed' || outcome === 'duplicate') return
  if (outcome === 'payloadConflict') {
    throw new ConflictException(
      `Event ${type} was already received with a different payload — same eventId, changed content`,
    )
  }
  throw new ServiceUnavailableException(
    `Event ${type} is being processed by another worker — retry`,
  )
}

@ApiTags('activities')
@Controller()
export class ActivitiesController {
  constructor(
    private readonly service: ActivitiesService,
    private readonly inbox: EventInboxService,
  ) {}

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
    const outcome = await this.inbox.process(event as never, () =>
      this.service.handleInboundEvent(event as any),
    )
    ackOrRetry(outcome, String(event['type'] ?? 'unknown'))
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
