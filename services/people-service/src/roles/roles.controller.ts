import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { RolesService } from './roles.service.js'
import { AssignRoleDto } from './dto/assign-role.dto.js'

@ApiTags('roles')
@Controller('people/:customerId/roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List roles for a person' })
  list(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
  ) {
    return this.service.list(req.tenantContext.tenantId, customerId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a role to a person' })
  assign(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.service.assign(req.tenantContext.tenantId, customerId, dto)
  }

  @Patch(':roleId/status')
  @ApiOperation({ summary: 'Update a role status (active/inactive/expired)' })
  updateStatus(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
    @Param('roleId') roleId: string,
    @Body() body: { status: 'active' | 'inactive' | 'expired' },
  ) {
    return this.service.updateStatus(req.tenantContext.tenantId, customerId, roleId, body.status)
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a person' })
  async remove(
    @Request() req: FastifyRequest & { tenantContext: { tenantId: string } },
    @Param('customerId') customerId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.service.remove(req.tenantContext.tenantId, customerId, roleId)
  }
}
