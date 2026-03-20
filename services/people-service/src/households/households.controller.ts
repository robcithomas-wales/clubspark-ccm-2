import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyRequest } from 'fastify'
import { Request } from '@nestjs/common'
import { HouseholdsService } from './households.service.js'
import { CreateHouseholdDto, AddHouseholdMemberDto, AddRelationshipDto } from './dto/create-household.dto.js'

type TenantReq = FastifyRequest & { tenantContext: { tenantId: string } }

@ApiTags('households')
@Controller()
export class HouseholdsController {
  constructor(private readonly service: HouseholdsService) {}

  // --- Households ---

  @Get('households')
  @ApiOperation({ summary: 'List all households for the tenant' })
  list(@Request() req: TenantReq) {
    return this.service.list(req.tenantContext.tenantId)
  }

  @Post('households')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a household' })
  create(@Request() req: TenantReq, @Body() dto: CreateHouseholdDto) {
    return this.service.create(req.tenantContext.tenantId, dto)
  }

  @Post('households/:householdId/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to a household' })
  addMember(
    @Request() req: TenantReq,
    @Param('householdId') householdId: string,
    @Body() dto: AddHouseholdMemberDto,
  ) {
    return this.service.addMember(req.tenantContext.tenantId, householdId, dto)
  }

  @Delete('households/:householdId/members/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a household' })
  async removeMember(
    @Request() req: TenantReq,
    @Param('householdId') householdId: string,
    @Param('customerId') customerId: string,
  ) {
    await this.service.removeMember(req.tenantContext.tenantId, householdId, customerId)
  }

  // --- Per-person household & relationship views ---

  @Get('people/:customerId/households')
  @ApiOperation({ summary: 'Get households a person belongs to' })
  listForCustomer(@Request() req: TenantReq, @Param('customerId') customerId: string) {
    return this.service.listForCustomer(req.tenantContext.tenantId, customerId)
  }

  @Get('people/:customerId/relationships')
  @ApiOperation({ summary: 'Get relationships for a person' })
  getRelationships(@Request() req: TenantReq, @Param('customerId') customerId: string) {
    return this.service.getRelationships(req.tenantContext.tenantId, customerId)
  }

  @Post('people/:customerId/relationships')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a relationship for a person' })
  addRelationship(
    @Request() req: TenantReq,
    @Param('customerId') customerId: string,
    @Body() dto: AddRelationshipDto,
  ) {
    return this.service.addRelationship(req.tenantContext.tenantId, customerId, dto)
  }

  @Delete('people/:customerId/relationships/:relationshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a relationship' })
  async removeRelationship(
    @Request() req: TenantReq,
    @Param('customerId') customerId: string,
    @Param('relationshipId') relationshipId: string,
  ) {
    await this.service.removeRelationship(req.tenantContext.tenantId, customerId, relationshipId)
  }
}
