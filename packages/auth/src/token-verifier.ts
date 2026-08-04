import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { AUTH_OPTIONS } from './constants.js'
import type { AuthOptions, JwksConfig, VerifiedClaims } from './types.js'

/**
 * Verifies a bearer token against a JWKS endpoint and maps its claims.
 *
 * This is the single place the platform talks to an identity provider. Moving
 * from Supabase to Microsoft Entra External ID is a change of `AuthOptions`
 * (see `presets.ts`), not a change of code here or in any service.
 */
@Injectable()
export class TokenVerifier {
  private readonly logger = new Logger(TokenVerifier.name)
  private keyStore: ReturnType<typeof createRemoteJWKSet> | null = null
  private resolved: JwksConfig | null = null

  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthOptions) {}

  /**
   * Resolved on first use, not at construction. The JWKS URL comes from the
   * environment, and `.env` is not loaded until `ConfigModule.forRoot()` runs —
   * which is after `AuthModule.forRoot()` in the imports array. Reading it
   * eagerly means every service fails to boot.
   */
  private config(): JwksConfig {
    if (!this.resolved) {
      this.resolved =
        typeof this.options.jwks === 'function' ? this.options.jwks() : this.options.jwks
    }
    return this.resolved
  }

  /**
   * One key store per process: `createRemoteJWKSet` caches keys and refreshes
   * them on rotation, so rebuilding it per request would refetch the document
   * every time.
   */
  private getKeyStore(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.keyStore) {
      const { url } = this.config()
      if (!url) throw new UnauthorizedException('JWKS URL is not configured')
      this.keyStore = createRemoteJWKSet(new URL(url))
    }
    return this.keyStore
  }

  async verify(token: string): Promise<VerifiedClaims> {
    const { issuer, audience } = this.config()

    try {
      const { payload } = await jwtVerify(token, this.getKeyStore(), {
        ...(issuer ? { issuer } : {}),
        ...(audience ? { audience } : {}),
      })
      return this.options.claims(payload)
    } catch (err) {
      // Logged, never returned: the reason a token failed (expired, wrong
      // issuer, unknown key) tells an attacker which direction to probe. One
      // service used to `console.error` this — keep the diagnostic, put it
      // behind the Nest logger, and still answer with the same opaque message.
      this.logger.warn(
        `JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
