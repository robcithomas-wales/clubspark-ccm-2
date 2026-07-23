import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
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
