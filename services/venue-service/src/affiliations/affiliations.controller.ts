import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common'
import { AffiliationsService } from './affiliations.service.js'
import { CreateAffiliationDto } from './dto/create-affiliation.dto.js'
import { UpdateAffiliationDto } from './dto/update-affiliation.dto.js'

@Controller('affiliations')
export class AffiliationsController {
  constructor(private readonly service: AffiliationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.tenantContext.tenantId)
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.service.getById(req.tenantContext.tenantId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAffiliationDto) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAffiliationDto) {
    return this.service.update(req.tenantContext.tenantId, id, dto)
  }
}
