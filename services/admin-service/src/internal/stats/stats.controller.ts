import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { StatsService } from './stats.service.js'
import { InternalGuard } from '../guards/internal.guard.js'

@ApiTags('internal/stats')
@UseGuards(InternalGuard)
@Controller({ path: 'internal/stats', version: '1' })
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Platform-wide stats for the internal dashboard' })
  async get() {
    return { data: await this.service.getPlatformStats() }
  }
}
