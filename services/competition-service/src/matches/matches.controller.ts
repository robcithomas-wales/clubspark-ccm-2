import { Controller, Get, Patch, Post, Param, Body, Query, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { MatchesService } from './matches.service.js'
import { SubmitResultDto } from './dto/submit-result.dto.js'
import { UpdateMatchDto } from './dto/update-match.dto.js'

@ApiTags('matches')
@Controller('competitions/:competitionId/matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get()
  list(
    @Param('competitionId') cId: string,
    @Query('divisionId') divisionId?: string,
    @Query('round') round?: number,
  ) {
    return this.service.list(cId, divisionId, round ? Number(round) : undefined)
  }

  @Get(':id')
  findOne(@Param('competitionId') cId: string, @Param('id') id: string) {
    return this.service.findById(cId, id)
  }

  @Patch(':id')
  update(@Param('competitionId') cId: string, @Param('id') id: string, @Body() dto: UpdateMatchDto) {
    return this.service.update(cId, id, dto)
  }

  @Post(':id/result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit or admin-verify a match result' })
  submitResult(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('id') id: string,
    @Body() dto: SubmitResultDto,
  ) {
    // For now treat all portal users as admin; player submission via mobile uses different route
    const isAdmin = true
    return this.service.submitResult(cId, id, dto, isAdmin)
  }

  @Post(':id/result/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin verifies a player-submitted result' })
  verifyResult(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('id') id: string,
  ) {
    return this.service.verifyResult(cId, id, null)
  }

  @Post(':id/result/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin disputes a submitted result' })
  disputeResult(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('competitionId') cId: string,
    @Param('id') id: string,
  ) {
    return this.service.disputeResult(cId, id, 'admin')
  }
}
