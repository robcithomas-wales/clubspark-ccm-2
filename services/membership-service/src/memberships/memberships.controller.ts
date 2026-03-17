import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { MembershipsService } from './memberships.service'
import { CreateMembershipDto } from './dto/create-membership.dto'
import { UpdateMembershipDto } from './dto/update-membership.dto'

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('ownerType') ownerType?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.list(tenantId, organisationId, {
      planId,
      status,
      customerId,
      ownerType,
      ownerId,
      search,
      limit,
      offset,
    })
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.getById(tenantId, organisationId, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateMembershipDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.create(tenantId, organisationId, dto)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    const { tenantId, organisationId } = req.tenantContext
    return this.service.update(tenantId, organisationId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const { tenantId, organisationId } = req.tenantContext
    await this.service.remove(tenantId, organisationId, id)
  }
}
