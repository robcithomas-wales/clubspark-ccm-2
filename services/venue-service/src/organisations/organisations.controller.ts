import { Controller, Get, Put, Post, Body, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { SetMetadata } from '@nestjs/common'
import { OrganisationsService } from './organisations.service.js'
import { UpsertOrganisationDto, PublicRegisterDto } from './dto/upsert-organisation.dto.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SKIP_TENANT_KEY } from '../common/guards/tenant-context.guard.js'

const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true)

@ApiTags('organisations')
@ApiSecurity('tenant-id')
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly service: OrganisationsService) {}

  @Get('me')
  getMe(@TenantCtx() ctx: TenantContext) {
    return this.service.getMyOrg(ctx.tenantId)
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  upsertMe(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertOrganisationDto) {
    return this.service.upsert(ctx.tenantId, dto)
  }

  // ─── Public endpoints (used by customer portal for tenant resolution) ─────

  @Get('public/by-slug')
  @SkipTenant()
  getBySlug(@Query('slug') slug: string) {
    return this.service.getBySlug(slug)
  }

  @Get('public/by-domain')
  @SkipTenant()
  getByDomain(@Query('domain') domain: string) {
    return this.service.getByDomain(domain)
  }

  /**
   * Public registration endpoint for the customer portal.
   * Creates a Supabase auth user with the org's tenantId in app_metadata,
   * then creates a linked customer record.
   */
  @Post('public/register')
  @SkipTenant()
  @HttpCode(HttpStatus.CREATED)
  async publicRegister(@Body() dto: PublicRegisterDto) {
    const supabaseUrl = process.env['SUPABASE_URL']
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
    if (!supabaseUrl || !serviceRoleKey) throw new BadRequestException('Server configuration error')

    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        app_metadata: { tenantId: dto.tenantId, organisationId: null, role: 'customer' },
        user_metadata: { firstName: dto.firstName, lastName: dto.lastName },
      }),
    })

    if (!res.ok) {
      const body = await res.json() as { message?: string }
      throw new BadRequestException(body.message ?? 'Registration failed')
    }

    const { user } = await res.json() as { user: { id: string } }

    const customerServiceUrl = process.env['CUSTOMER_SERVICE_URL']
    if (customerServiceUrl && user?.id) {
      await fetch(`${customerServiceUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': dto.tenantId,
          'x-customer-id-override': user.id,
        },
        body: JSON.stringify({ id: user.id, firstName: dto.firstName, lastName: dto.lastName, email: dto.email }),
      }).catch(() => { /* non-fatal */ })
    }

    return { data: { message: 'Account created. Please sign in.' } }
  }
}
