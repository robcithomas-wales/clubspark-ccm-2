import { Controller, Get, Post, Delete, Param, Query, Res, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { OAuthConnectionsService } from './oauth-connections.service.js'
import { TenantCtx, type TenantContext } from '../common/decorators/tenant-context.decorator.js'
import { SkipTenant } from '@clubspark/auth'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'

@ApiTags('OAuth Connections')
@Controller({ path: 'connections', version: '1' })
export class OAuthConnectionsController {
  constructor(
    private readonly service: OAuthConnectionsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active OAuth connections for tenant' })
  list(@TenantCtx() ctx: TenantContext) {
    return this.service.list(ctx.tenantId)
  }

  @Delete(':provider')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disconnect an OAuth provider' })
  disconnect(@TenantCtx() ctx: TenantContext, @Param('provider') provider: string) {
    return this.service.disconnect(ctx.tenantId, provider)
  }

  // ── Xero OAuth flow (browser redirects — skip tenant guard) ──────────────

  @Get('xero/authorise')
  @SkipTenant()
  @ApiOperation({ summary: 'Initiate Xero OAuth authorisation' })
  xeroAuthorise(@Query('tenantId') tenantId: string, @Res() res: FastifyReply) {
    const url = this.service.buildXeroAuthUrl(tenantId)
    void res.redirect(url)
  }

  @Get('xero/callback')
  @SkipTenant()
  @ApiOperation({ summary: 'Xero OAuth callback' })
  async xeroCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    const tenantId = await this.service.handleXeroCallback(code, state)
    const adminUrl = this.config.get('adminPortalUrl', { infer: true })
    void res.redirect(
      `${adminUrl}/settings/integrations/accounting?connected=xero&tenant=${tenantId}`,
    )
  }

  // ── QuickBooks OAuth flow ─────────────────────────────────────────────────

  @Get('quickbooks/authorise')
  @SkipTenant()
  @ApiOperation({ summary: 'Initiate QuickBooks OAuth authorisation' })
  qbAuthorise(@Query('tenantId') tenantId: string, @Res() res: FastifyReply) {
    const url = this.service.buildQuickBooksAuthUrl(tenantId)
    void res.redirect(url)
  }

  @Get('quickbooks/callback')
  @SkipTenant()
  @ApiOperation({ summary: 'QuickBooks OAuth callback' })
  async qbCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string,
    @Res() res: FastifyReply,
  ) {
    const tenantId = await this.service.handleQuickBooksCallback(code, state, realmId)
    const adminUrl = this.config.get('adminPortalUrl', { infer: true })
    void res.redirect(
      `${adminUrl}/settings/integrations/accounting?connected=quickbooks&tenant=${tenantId}`,
    )
  }

  // ── Initiate connect via API (returns auth URL for SPA redirect) ──────────

  @Post('xero/connect')
  @ApiOperation({ summary: 'Get Xero OAuth URL (for SPA-initiated flow)' })
  xeroConnect(@TenantCtx() ctx: TenantContext) {
    return { url: this.service.buildXeroAuthUrl(ctx.tenantId) }
  }

  @Post('quickbooks/connect')
  @ApiOperation({ summary: 'Get QuickBooks OAuth URL (for SPA-initiated flow)' })
  qbConnect(@TenantCtx() ctx: TenantContext) {
    return { url: this.service.buildQuickBooksAuthUrl(ctx.tenantId) }
  }
}
