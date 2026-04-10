import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SponsorsService } from './sponsors.service.js'
import { CreateSponsorDto } from './dto/create-sponsor.dto.js'
import { UpdateSponsorDto } from './dto/update-sponsor.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js'

@ApiTags('sponsors')
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly service: SponsorsService) {}

  // ── Public endpoint (customer portal) ────────────────────────────────────

  @Get('public')
  @SkipTenant()
  @ApiOperation({ summary: 'List active sponsors for a tenant (public)' })
  listPublic(@Query('tenantId') tenantId: string) {
    return this.service.list(tenantId, true)
  }

  // ── Authenticated endpoints ───────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List sponsors (admin)' })
  list(@TenantCtx() ctx: TenantContext, @Query('activeOnly') activeOnly?: boolean) {
    return this.service.list(ctx.tenantId, activeOnly !== false)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a sponsor' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateSponsorDto) {
    return this.service.create(ctx.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sponsor' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateSponsorDto) {
    return this.service.update(ctx.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a sponsor' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id)
  }
}
