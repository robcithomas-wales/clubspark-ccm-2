import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InternalSecretGuard, SkipTenant } from '@clubspark/auth'
import { OutboxOperationsService } from './outbox-operations.service.js'

@Controller('projection-outbox/internal')
@SkipTenant()
@UseGuards(InternalSecretGuard)
export class OutboxOperationsController {
  constructor(private readonly operations: OutboxOperationsService) {}

  @Get('status')
  status(@Headers('x-tenant-id') tenantId?: string) {
    return this.operations.status(this.requireTenant(tenantId))
  }

  @Get('dead-letters')
  deadLetters(@Headers('x-tenant-id') tenantId?: string, @Query('limit') limit?: string) {
    return this.operations.deadLetters(this.requireTenant(tenantId), Number(limit) || 50)
  }

  @Post(':id/replay')
  replay(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.operations.replay(this.requireTenant(tenantId), id)
  }

  private requireTenant(tenantId?: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required')
    return tenantId
  }
}
