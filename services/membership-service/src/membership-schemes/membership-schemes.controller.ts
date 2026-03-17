import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common'
import { MembershipSchemesService } from './membership-schemes.service'
import { CreateMembershipSchemeDto } from './dto/create-membership-scheme.dto'
import { UpdateMembershipSchemeDto } from './dto/update-membership-scheme.dto'

@Controller('membership-schemes')
export class MembershipSchemesController {
  constructor(private readonly service: MembershipSchemesService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.list(tenantId, organisationId, { status, search, limit, offset })
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getById(tenantId, organisationId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateMembershipSchemeDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMembershipSchemeDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.update(tenantId, organisationId, id, dto)
  }
}
