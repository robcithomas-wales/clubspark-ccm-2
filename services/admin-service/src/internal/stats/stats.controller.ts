import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { StatsService } from './stats.service.js'
import { InternalSecretGuard } from '@clubspark/auth'
import { StaffAttributionInterceptor } from '../staff-attribution.interceptor.js'

@ApiTags('internal/stats')
@UseGuards(InternalSecretGuard)
@UseInterceptors(StaffAttributionInterceptor)
@Controller({ path: 'internal/stats', version: '1' })
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Platform-wide stats for the internal dashboard' })
  async get() {
    return { data: await this.service.getPlatformStats() }
  }
}
