import type { JWTPayload } from 'jose'
import type { AuthOptions, VerifiedClaims } from './types.js'

/**
 * Everything a preset does not decide for you. All optional: `region` is
 * resolved from the environment by default, but stays overridable so a test can
 * pin it without setting a process-wide variable.
 */
/** The only region in service today. Applied in test/development only. */
const DEFAULT_DEV_REGION = 'eu-west-2'

type PresetOverrides = Partial<Omit<AuthOptions, 'jwks' | 'claims'>>

/**
 * Supabase — the current identity provider.
 *
 * Tenant and organisation live in `app_metadata`, which Supabase treats as
 * server-writable only. Never read them from `user_metadata`: that IS writable
 * by the end user, so a tenant id taken from there is caller-controlled.
 */
/**
 * The region this process serves.
 *
 * Required in production, with **no default there**. A global default would be
 * the wrong call: every deployment would silently inherit it, the first region
 * to differ would be misconfigured with no signal, and the symptom would be
 * customer data served from the wrong jurisdiction.
 *
 * Test and development get `eu-west-2`, matching the only region that exists
 * today. Same allowlist as the tenant guard's header fallback — two exact
 * values, so an unset or misspelled NODE_ENV fails closed and demands the
 * variable rather than quietly assuming one.
 */
export function resolveRegion(): string {
  const region = process.env['CLUBSPARK_REGION']
  if (region) return region

  const env = process.env['NODE_ENV']
  if (env === 'test' || env === 'development') return DEFAULT_DEV_REGION

  throw new Error(
    'CLUBSPARK_REGION is not set. Every service must declare the region it serves ' +
      "(e.g. 'eu-west-2') so it can refuse tenants whose data belongs elsewhere — " +
      'see .env.example.',
  )
}

export function supabaseAuth(overrides: PresetOverrides = {}): AuthOptions {
  return {
    region: resolveRegion,
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
        // Absent today — Supabase is not configured to emit it. Reading it here
        // means turning residency enforcement on is a change to the IdP, not to
        // this codebase.
        ...(typeof meta['homeRegion'] === 'string' ? { homeRegion: meta['homeRegion'] } : {}),
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
    region: resolveRegion,
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
      const home = payload[`${prefix}homeRegion`]
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
        ...(typeof home === 'string' ? { homeRegion: home } : {}),
      }
    },
    ...overrides,
  }
}
