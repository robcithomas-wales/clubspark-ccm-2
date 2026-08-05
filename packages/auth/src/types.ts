import type { JWTPayload } from 'jose'

/**
 * The authenticated caller, attached to every request as `request.tenantContext`.
 *
 * `userId` is optional, and absent means genuinely unknown — a header-authenticated
 * request (tests, local dev) that sent no `x-user-id`. Do NOT substitute a
 * placeholder: two services used to default it to the string `'test-user'`, and
 * the moment a third service persisted it, it hit a `uuid` column and every write
 * 500'd. An absent value that callers must handle beats a fake one that typechecks.
 */
export interface TenantContext {
  userId?: string
  tenantId: string
  organisationId?: string
  /**
   * The region serving this request — i.e. the region this process is deployed
   * in, from `CLUBSPARK_REGION`. Always present.
   *
   * With one region every request carries the same value, which is the point:
   * the plumbing exists and is exercised before there is a second region to get
   * it wrong with. Data residency is a hard requirement, and retrofitting a
   * region onto every request path after customers exist is the expensive
   * version of this change.
   */
  region: string
}

/**
 * What a token must yield to authenticate a request. Mapping a provider's claims
 * onto this shape is the ONLY provider-specific code in this package — see
 * `presets.ts`.
 */
export interface VerifiedClaims {
  userId?: string
  tenantId?: string
  organisationId?: string
  /**
   * The tenant's HOME region, if the identity provider puts it in the token.
   * Distinct from `TenantContext.region`, which is where the request is being
   * served: if these disagree the request has reached the wrong region and is
   * refused.
   *
   * Supabase does not emit this today, so it is normally absent and the check is
   * a no-op. Entra can, via a claims-mapping policy.
   */
  homeRegion?: string
}

/** Maps a verified JWT payload onto the platform's claim names. */
export type ClaimMapper = (payload: JWTPayload) => VerifiedClaims

export interface JwksConfig {
  /** Full URL of the provider's JWKS document. */
  url: string
  /** Expected `iss`. Omit to skip issuer validation (not advisable in production). */
  issuer?: string
  /** Expected `aud`. Omit to skip audience validation. */
  audience?: string
}

/**
 * Resolved on first use, never at module construction.
 *
 * This has to be lazy. `AuthModule.forRoot(...)` is evaluated inside the
 * `@Module({ imports: [...] })` array, and array elements evaluate in order —
 * so it runs *before* `ConfigModule.forRoot()`, which is what loads `.env`.
 * Reading `process.env` eagerly therefore sees nothing and every service fails
 * to boot. A thunk defers the read until the first token arrives, which is what
 * the per-service guards used to do.
 */
export type JwksConfigSource = JwksConfig | (() => JwksConfig)

/**
 * Also lazy, and for exactly the same reason as `JwksConfigSource`: it is read
 * from `CLUBSPARK_REGION`, and `AuthModule.forRoot(...)` runs before
 * `ConfigModule.forRoot()` has loaded `.env`. Resolving eagerly means no service
 * can start unless the variable happens to be exported in the shell.
 */
export type RegionSource = string | (() => string)

export interface AuthOptions {
  /**
   * The region this process serves, e.g. `eu-west-2`. Resolved from
   * `CLUBSPARK_REGION` by the presets.
   *
   * Required, and deliberately so: a service that does not know its own region
   * cannot tell whether it is allowed to serve a given tenant, and data
   * residency is a legal boundary rather than a best effort. Failing on the
   * first request is much better than serving EU data from the wrong place.
   */
  region: RegionSource
  /** Where to fetch signing keys, and what to validate the token against. */
  jwks: JwksConfigSource
  /** Maps the provider's payload onto `VerifiedClaims`. */
  claims: ClaimMapper
  /**
   * Paths that bypass authentication entirely, matched as prefixes against the
   * path (query string stripped). Defaults to `[]` — prefer `@SkipTenant()` on
   * the handler, which is visible at the point it applies.
   */
  publicPathPrefixes?: string[]
  /**
   * Paths that bypass the *tenant* guard because they are authenticated another
   * way — in practice, service-to-service routes behind `InternalSecretGuard`.
   *
   * ⚠️ Anything under these prefixes is unauthenticated unless its controller
   * carries `@UseGuards(InternalSecretGuard)`. Adding a controller here and
   * forgetting the guard exposes it publicly. Kept separate from
   * `publicPathPrefixes` so the risk is legible, and logged at startup.
   */
  internalPathPrefixes?: string[]
  /**
   * Allow `x-tenant-id` / `x-organisation-id` headers instead of a JWT.
   *
   * Fail-closed: defaults to true ONLY when NODE_ENV is exactly 'test' or
   * 'development'. In production, and when NODE_ENV is unset, header auth is
   * refused — otherwise any caller could set `x-tenant-id` and read another
   * tenant's data.
   */
  allowHeaderFallback?: boolean
}
