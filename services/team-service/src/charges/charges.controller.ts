import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus, Request } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { ChargesService } from './charges.service.js'
import { CreateChargeRunDto } from './dto/create-charge-run.dto.js'

class WaiveChargeDto {
  notes?: string
}

@ApiTags('charges')
@Controller('teams/:teamId/fixtures/:fixtureId/charge-runs')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Get()
  @ApiOperation({ summary: 'List all charge runs for a fixture' })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
  ) {
    return this.service.getRunsForFixture(req.tenantContext.tenantId, teamId, fixtureId)
  }

  @Post()
  @ApiOperation({ summary: 'Initiate a charge run for a fixture' })
  create(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string; userId?: string } },
    @Param('teamId') teamId: string,
    @Param('fixtureId') fixtureId: string,
    @Body() dto: CreateChargeRunDto,
  ) {
    const initiatedBy = req.tenantContext.userId ?? null
    return this.service.createRun(req.tenantContext.tenantId, teamId, fixtureId, dto, initiatedBy)
  }

  @Patch('charges/:chargeId/waive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Waive an individual charge' })
  waive(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('chargeId') chargeId: string,
    @Body() body: WaiveChargeDto,
  ) {
    return this.service.waiveCharge(req.tenantContext.tenantId, chargeId, body.notes)
  }

  @Patch('charges/:chargeId/paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a charge as manually paid' })
  paid(
    @Param('chargeId') chargeId: string,
    @Body() body: { paymentId?: string },
  ) {
    return this.service.markChargePaid(chargeId, body.paymentId)
  }
}
