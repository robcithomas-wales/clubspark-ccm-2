import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiSecurity } from '@nestjs/swagger'
import { IsOptional, IsBoolean, IsString, IsNotEmpty, IsEmail } from 'class-validator'
import { SetMetadata } from '@nestjs/common'
import { VenuesService } from './venues.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SKIP_TENANT_KEY } from '../common/guards/tenant-context.guard.js'

// ─── Inline decorator so we don't need a separate file ───────────────────────
const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true)

class UpsertVenueSettingsDto {
  @IsOptional() @IsBoolean() openBookings?: boolean
  @IsOptional() @IsBoolean() addOnsEnabled?: boolean
  @IsOptional() @IsBoolean() pendingApprovals?: boolean
  @IsOptional() @IsBoolean() splitPayments?: boolean
  @IsOptional() @IsString()  publicBookingView?: string
}

class CustomerRegisterDto {
  @IsString() @IsNotEmpty() clubCode!: string
  @IsEmail()               email!: string
  @IsString() @IsNotEmpty() password!: string
  @IsString() @IsNotEmpty() firstName!: string
  @IsString() @IsNotEmpty() lastName!: string
}

@ApiTags('venues')
@ApiSecurity('tenant-id')
@Controller('venues')
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Get()
  async list(@TenantCtx() ctx: TenantContext) {
    const venues = await this.service.listVenues(ctx.tenantId)
    return { data: venues }
  }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) {
    const settings = await this.service.getSettings(id)
    return { data: settings ?? { venueId: id } }
  }

  @Put(':id/settings')
  @HttpCode(HttpStatus.OK)
  async upsertSettings(@Param('id') id: string, @Body() dto: UpsertVenueSettingsDto) {
    const settings = await this.service.upsertSettings(id, dto)
    return { data: settings }
  }

  // ─── Public endpoints (no auth — used by mobile app) ─────────────────────

  /**
   * Returns branding config for the mobile app given a club code.
   * No auth required — the response only contains public branding info + tenantId.
   */
  @Get('public/config/:clubCode')
  @SkipTenant()
  @HttpCode(HttpStatus.OK)
  async getPublicConfig(@Param('clubCode') clubCode: string) {
    const config = await this.service.getPublicConfig(clubCode.toLowerCase().trim())
    if (!config) throw new NotFoundException('Club not found. Check your club code and try again.')
    return { data: config }
  }

  /**
   * Registers a new customer account for a given club.
   * Creates the Supabase user with tenantId in app_metadata using the service role key.
   * No auth required — this is the sign-up entry point for the mobile app.
   */
  @Post('public/register')
  @SkipTenant()
  @HttpCode(HttpStatus.CREATED)
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    const config = await this.service.getPublicConfig(dto.clubCode.toLowerCase().trim())
    if (!config) throw new NotFoundException('Club not found. Check your club code.')

    const supabaseUrl = process.env['SUPABASE_URL']
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('Server configuration error')
    }

    // Create user in Supabase with tenantId baked into app_metadata
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
        app_metadata: {
          tenantId: config.tenantId,
          organisationId: null,
          role: 'customer',
        },
        user_metadata: {
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json() as { message?: string }
      throw new BadRequestException(body.message ?? 'Registration failed')
    }

    const { user } = await res.json() as { user: { id: string } }

    // Create the customer record using the Supabase user ID so they stay in sync
    const customerServiceUrl = process.env['CUSTOMER_SERVICE_URL']
    if (customerServiceUrl && user?.id) {
      await fetch(`${customerServiceUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': config.tenantId,
          'x-customer-id-override': user.id,
        },
        body: JSON.stringify({
          id: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
        }),
      }).catch(() => { /* non-fatal — customer record can be created on first login */ })
    }

    return {
      data: {
        message: 'Account created. Please sign in.',
        venueName: config.venueName,
        appName: config.appName,
      },
    }
  }
}
