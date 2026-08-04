import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AddOnsService } from './add-ons.service.js'
import { AttachAddOnDto } from './dto/attach-add-on.dto.js'
import type { TenantContext } from '@clubspark/auth'

type RequestWithCtx = { tenantContext?: TenantContext }

@ApiTags('add-ons')
@Controller('v1/add-ons')
export class AddOnsController {
  constructor(private readonly service: AddOnsService) {}

  /** List the full add-on catalog. */
  @Get()
  findAll() {
    return this.service.findAll()
  }

  /** List active add-ons for an org. */
  @Get('org/:orgId')
  findByOrg(@Req() req: RequestWithCtx, @Param('orgId') orgId: string) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.findByOrg(orgId, tenantId)
  }

  /** Attach an add-on to an org. */
  @Post()
  attach(@Req() req: RequestWithCtx, @Body() dto: AttachAddOnDto) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.attach(tenantId, dto)
  }

  /** Detach (cancel) an add-on from an org. */
  @Delete('org/:orgId/:addOnId')
  detach(
    @Req() req: RequestWithCtx,
    @Param('orgId') orgId: string,
    @Param('addOnId') addOnId: string,
  ) {
    const { tenantId } = req.tenantContext as TenantContext
    return this.service.detach(orgId, addOnId, tenantId)
  }
}
