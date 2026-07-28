import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { OAuthConnectionsRepository } from './oauth-connections.repository.js'
import { encryptToken, decryptToken } from '../common/crypto/token-encryption.js'
import type { AppConfig } from '../config/configuration.js'

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'

const QB_AUTH_URL_SANDBOX = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

@Injectable()
export class OAuthConnectionsService {
  private readonly encryptionKey: string
  private readonly stateSecret: string

  constructor(
    private readonly repo: OAuthConnectionsRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.encryptionKey = config.get('tokenEncryptionKey', { infer: true })
    this.stateSecret = config.get('oauthStateSecret', { infer: true })
    // Fail closed: without a signing secret we cannot prevent tenantId tampering
    // on the OAuth callback, so refuse to start rather than sign with nothing.
    if (!this.stateSecret) {
      throw new Error('OAUTH_STATE_SECRET is not configured')
    }
  }

  // ── OAuth state signing ────────────────────────────────────────────────────
  // The `state` round-trips the tenantId through the provider's browser redirect.
  // It is HMAC-signed so a forged/tampered callback cannot inject an arbitrary
  // tenantId. The signature is embedded in the (still base64url-JSON) state.

  private stateHmac(tenantId: string, nonce: string): string {
    return createHmac('sha256', this.stateSecret).update(`${tenantId}.${nonce}`).digest('hex')
  }

  private signState(tenantId: string): string {
    const nonce = randomBytes(16).toString('hex')
    const sig = this.stateHmac(tenantId, nonce)
    return Buffer.from(JSON.stringify({ tenantId, nonce, sig })).toString('base64url')
  }

  private verifyState(state: string): string {
    let parsed: { tenantId?: string; nonce?: string; sig?: string }
    try {
      parsed = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      throw new BadRequestException('Invalid OAuth state')
    }
    const { tenantId, nonce, sig } = parsed
    if (!tenantId || !nonce || !sig) throw new BadRequestException('Invalid OAuth state')

    const expected = this.stateHmac(tenantId, nonce)
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestException('OAuth state signature mismatch')
    }
    return tenantId
  }

  // ── Xero ─────────────────────────────────────────────────────────────────

  buildXeroAuthUrl(tenantId: string): string {
    const xero = this.config.get('xero', { infer: true })
    const state = this.signState(tenantId)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: xero.clientId,
      redirect_uri: xero.redirectUri,
      scope: xero.scopes,
      state,
    })
    return `${XERO_AUTH_URL}?${params}`
  }

  async handleXeroCallback(code: string, state: string) {
    const tenantId = this.verifyState(state)
    const xero = this.config.get('xero', { infer: true })

    const tokenRes = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${xero.clientId}:${xero.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: xero.redirectUri,
      }),
    })
    if (!tokenRes.ok) throw new Error(`Xero token exchange failed: ${tokenRes.status}`)
    const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number }

    // Fetch Xero tenant connections to get the tenantId (org ID)
    const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    })
    const connections = connectionsRes.ok ? (await connectionsRes.json() as Array<{ tenantId: string }>) : []
    const providerTenantId = connections[0]?.tenantId ?? null

    await this.repo.upsert({
      tenantId,
      provider: 'xero',
      providerTenantId,
      accessToken: encryptToken(tokens.access_token, this.encryptionKey),
      refreshToken: encryptToken(tokens.refresh_token, this.encryptionKey),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: xero.scopes.split(' '),
    })

    return tenantId
  }

  async refreshXeroTokens(connectionId: string): Promise<{ accessToken: string }> {
    const conn = await this.repo.findById(connectionId)
    if (!conn) throw new NotFoundException('OAuth connection not found')

    const xero = this.config.get('xero', { infer: true })
    const refreshToken = decryptToken(conn.refreshToken, this.encryptionKey)

    const res = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${xero.clientId}:${xero.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    })
    if (!res.ok) throw new Error(`Xero token refresh failed: ${res.status}`)
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

    await this.repo.updateTokens(connectionId, {
      accessToken: encryptToken(tokens.access_token, this.encryptionKey),
      refreshToken: encryptToken(tokens.refresh_token, this.encryptionKey),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    })

    return { accessToken: tokens.access_token }
  }

  // ── QuickBooks ────────────────────────────────────────────────────────────

  buildQuickBooksAuthUrl(tenantId: string): string {
    const qb = this.config.get('quickbooks', { infer: true })
    const state = this.signState(tenantId)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: qb.clientId,
      redirect_uri: qb.redirectUri,
      scope: 'com.intuit.quickbooks.accounting',
      state,
    })
    return `${QB_AUTH_URL_SANDBOX}?${params}`
  }

  async handleQuickBooksCallback(code: string, state: string, realmId: string) {
    const tenantId = this.verifyState(state)
    const qb = this.config.get('quickbooks', { infer: true })

    const res = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${qb.clientId}:${qb.clientSecret}`).toString('base64')}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: qb.redirectUri,
      }),
    })
    if (!res.ok) throw new Error(`QuickBooks token exchange failed: ${res.status}`)
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number; x_refresh_token_expires_in: number }

    await this.repo.upsert({
      tenantId,
      provider: 'quickbooks',
      providerTenantId: realmId,
      accessToken: encryptToken(tokens.access_token, this.encryptionKey),
      refreshToken: encryptToken(tokens.refresh_token, this.encryptionKey),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: ['com.intuit.quickbooks.accounting'],
    })

    return tenantId
  }

  async refreshQuickBooksTokens(connectionId: string): Promise<{ accessToken: string; realmId: string }> {
    const conn = await this.repo.findById(connectionId)
    if (!conn) throw new NotFoundException('OAuth connection not found')

    const qb = this.config.get('quickbooks', { infer: true })
    const refreshToken = decryptToken(conn.refreshToken, this.encryptionKey)

    const res = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${qb.clientId}:${qb.clientSecret}`).toString('base64')}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    })
    if (!res.ok) throw new Error(`QuickBooks token refresh failed: ${res.status}`)
    const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

    await this.repo.updateTokens(connectionId, {
      accessToken: encryptToken(tokens.access_token, this.encryptionKey),
      refreshToken: encryptToken(tokens.refresh_token, this.encryptionKey),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    })

    return { accessToken: tokens.access_token, realmId: conn.providerTenantId ?? '' }
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  async list(tenantId: string) {
    const conns = await this.repo.findByTenant(tenantId)
    return {
      data: conns.map((c) => ({
        id: c.id,
        provider: c.provider,
        providerTenantId: c.providerTenantId,
        scopes: c.scopes,
        connectedAt: c.connectedAt.toISOString(),
        tokenExpiry: c.tokenExpiry.toISOString(),
      })),
    }
  }

  async disconnect(tenantId: string, provider: string) {
    const conn = await this.repo.findByTenantAndProvider(tenantId, provider)
    if (!conn) throw new NotFoundException(`No active ${provider} connection`)
    await this.repo.disconnect(tenantId, provider)
    return { success: true }
  }

  async getActiveToken(tenantId: string, provider: string): Promise<{ accessToken: string; realmId: string | null; connectionId: string } | null> {
    const conn = await this.repo.findByTenantAndProvider(tenantId, provider)
    if (!conn) return null

    // Refresh if expiring within 5 minutes
    if (conn.tokenExpiry <= new Date(Date.now() + 5 * 60 * 1000)) {
      if (provider === 'xero') {
        const { accessToken } = await this.refreshXeroTokens(conn.id)
        return { accessToken, realmId: conn.providerTenantId, connectionId: conn.id }
      } else {
        const { accessToken, realmId } = await this.refreshQuickBooksTokens(conn.id)
        return { accessToken, realmId, connectionId: conn.id }
      }
    }

    return {
      accessToken: decryptToken(conn.accessToken, this.encryptionKey),
      realmId: conn.providerTenantId,
      connectionId: conn.id,
    }
  }
}
