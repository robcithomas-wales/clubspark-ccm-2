import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MatchingService } from './matching.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'

@ApiTags('Matching')
@Controller('v1/match')
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  @Get(':personId')
  @ApiOperation({ summary: 'Find player match suggestions for a person within a sport' })
  @ApiQuery({ name: 'sport', required: true, description: 'Sport identifier (e.g. tennis, squash)' })
  findMatches(
    @TenantCtx() ctx: TenantContext,
    @Param('personId') personId: string,
    @Query('sport') sport: string,
  ) {
    return this.service.findMatches(ctx.tenantId, personId, sport ?? 'tennis')
  }
}
