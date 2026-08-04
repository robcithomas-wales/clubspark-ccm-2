import type { JWTPayload } from 'jose'
import type { AuthOptions, VerifiedClaims } from './types.js'

type PresetOverrides = Omit<AuthOptions, 'jwks' | 'claims'>

/**
 * Supabase — the current identity provider.
 *
 * Tenant and organisation live in `app_metadata`, which Supabase treats as
 * server-writable only. Never read them from `user_metadata`: that IS writable
 * by the end user, so a tenant id taken from there is caller-controlled.
 */
export function supabaseAuth(overrides: PresetOverrides = {}): AuthOptions {
  return {
    // A thunk, not a value: this runs inside the `imports: [...]` array, which
    // is evaluated before `ConfigModule.forRoot()` loads `.env`. Reading
    // SUPABASE_URL here rather than on first use would see nothing.
    jwks: () => {
      const url = process.env['SUPABASE_URL']
      if (!url) {
        throw new Error(
          'SUPABASE_URL is not set. Every service needs it to verify JWTs — see .env.example.',
        )
      }
      return { url: `${url}/auth/v1/.well-known/jwks.json`, issuer: `${url}/auth/v1` }
    },
    claims: (payload: JWTPayload): VerifiedClaims => {
      const meta = (payload['app_metadata'] ?? {}) as Record<string, unknown>
      return {
        ...(payload.sub ? { userId: payload.sub } : {}),
        ...(typeof meta['tenantId'] === 'string' ? { tenantId: meta['tenantId'] } : {}),
        ...(typeof meta['organisationId'] === 'string'
          ? { organisationId: meta['organisationId'] }
          : {}),
      }
    },
    ...overrides,
  }
}

/**
 * Microsoft Entra External ID — the Azure target.
 *
 * Not in use yet. It is here so the migration is visibly a configuration change:
 * a service swaps `supabaseAuth()` for `entraAuth()` in its `AuthModule.forRoot`
 * call and nothing else moves. No guard, controller, or service is aware of
 * which provider issued the token.
 *
 * Tenant and organisation are read from custom claims, which must be added as
 * optional claims / claims-mapping policy on the app registration. Entra will
 * not emit them otherwise, and the guard will reject every token with
 * "missing tenantId claim" — that is the expected first failure when wiring
 * this up, not a bug in the guard.
 */
export function entraAuth(
  config: { tenantId: string; audience: string; claimPrefix?: string },
  overrides: PresetOverrides = {},
): AuthOptions {
  const prefix = config.claimPrefix ?? 'extension_'

  return {
    jwks: () => {
      const base = `https://login.microsoftonline.com/${config.tenantId}`
      return {
        url: `${base}/discovery/v2.0/keys`,
        issuer: `${base}/v2.0`,
        audience: config.audience,
      }
    },
    claims: (payload: JWTPayload): VerifiedClaims => {
      const tenant = payload[`${prefix}tenantId`]
      const org = payload[`${prefix}organisationId`]
      return {
        // `oid` is the stable per-user object id; `sub` is pairwise per
        // application and differs between services for the same person.
        ...(typeof payload['oid'] === 'string'
          ? { userId: payload['oid'] }
          : payload.sub
            ? { userId: payload.sub }
            : {}),
        ...(typeof tenant === 'string' ? { tenantId: tenant } : {}),
        ...(typeof org === 'string' ? { organisationId: org } : {}),
      }
    },
    ...overrides,
  }
}
