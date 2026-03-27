import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { StandingsService } from './standings.service.js'

@ApiTags('standings')
@Controller('competitions/:competitionId/divisions/:divisionId/standings')
export class StandingsController {
  constructor(private readonly service: StandingsService) {}

  @Get()
  list(@Param('competitionId') cId: string, @Param('divisionId') divisionId: string) {
    return this.service.list(cId, divisionId)
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger standings recalculation' })
  recalculate(@Param('competitionId') cId: string, @Param('divisionId') divisionId: string) {
    return this.service.recalculate(cId, divisionId).then(() => ({ ok: true }))
  }
}
