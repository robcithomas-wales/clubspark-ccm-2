import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { ActivitiesService } from './activities.service.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'

@ApiTags('activities')
@Controller()
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  /** Inbound domain events from booking-service, membership-service, etc. */
  @SkipTenant()
  @Post('events/inbound')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inbound(
    @Request() req: FastifyRequest,
    @Body() event: Record<string, unknown>,
  ) {
    // SECURITY: this endpoint skips tenant auth (internal event delivery reads
    // tenantId from the body), so it must be gated by a shared internal secret.
    // Fail-closed: if INTERNAL_SECRET is unset, reject unless NODE_ENV is
    // explicitly 'test' or 'development' — matching the tenant-guard pattern.
    const expected = process.env['INTERNAL_SECRET']
    if (!expected) {
      if (
        process.env['NODE_ENV'] !== 'test' &&
        process.env['NODE_ENV'] !== 'development'
      ) {
        throw new UnauthorizedException('Internal event secret is not configured')
      }
    } else {
      const provided = req.headers['x-internal-secret'] as string | undefined
      if (provided !== expected) {
        throw new UnauthorizedException('Invalid internal event secret')
      }
    }

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
