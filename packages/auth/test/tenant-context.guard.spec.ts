/**
 * The tenant guard decides, for every request on the platform, whether it is
 * authenticated and which tenant's data it may touch. Fifteen services depend on
 * this one file, so the fail-closed paths are tested directly rather than only
 * through a service's integration suite.
 *
 * No database and no network: the verifier is stubbed, so these run in
 * milliseconds and are safe to run in parallel with anything.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { TenantContextGuard } from '../src/tenant-context.guard.js'
import { InternalSecretGuard } from '../src/internal-secret.guard.js'
import { SKIP_TENANT_KEY } from '../src/constants.js'
import { resolveRegion } from '../src/presets.js'
import type { AuthOptions, VerifiedClaims } from '../src/types.js'
import type { TokenVerifier } from '../src/token-verifier.js'

const REGION = 'eu-west-2'
const TENANT = '11111111-1111-1111-1111-111111111111'
const ORG = '22222222-2222-2222-2222-222222222222'
const USER = '33333333-3333-3333-3333-333333333333'

interface RequestShape {
  url?: string
  headers: Record<string, string | undefined>
  tenantContext?: unknown
}

function contextFor(request: RequestShape): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext
}

function buildGuard(
  options: Partial<AuthOptions> = {},
  opts: { skip?: boolean; claims?: VerifiedClaims; verifyThrows?: boolean } = {},
) {
  const reflector = {
    getAllAndOverride: (key: string) => (key === SKIP_TENANT_KEY ? opts.skip : undefined),
  } as unknown as Reflector

  const verifier = {
    verify: vi.fn(async () => {
      if (opts.verifyThrows) throw new UnauthorizedException('Invalid or expired token')
      return opts.claims ?? { userId: USER, tenantId: TENANT, organisationId: ORG }
    }),
  } as unknown as TokenVerifier

  const resolved: AuthOptions = {
    region: REGION,
    jwks: { url: 'https://example.test/jwks' },
    claims: () => ({}),
    allowHeaderFallback: false,
    ...options,
  }

  return { guard: new TenantContextGuard(reflector, verifier, resolved), verifier }
}

describe('TenantContextGuard', () => {
  describe('@SkipTenant()', () => {
    it('lets the request through without any credentials', async () => {
      const { guard } = buildGuard({}, { skip: true })
      const req: RequestShape = { url: '/health', headers: {} }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
      expect(req.tenantContext).toBeUndefined()
    })

    // Regression: two services' copies of this guard had no Reflector at all, so
    // the decorator was inert and only a hard-coded '/health' prefix saved their
    // probes. Anyone applying it to another route would have got a silent 401.
    it('is honoured on a route that is not /health', async () => {
      const { guard } = buildGuard({}, { skip: true })
      const req: RequestShape = { url: '/v1/webhooks/stripe', headers: {} }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    })
  })

  describe('JWT path', () => {
    it('accepts a valid token and populates tenant context', async () => {
      const { guard } = buildGuard()
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
      expect(req.tenantContext).toEqual({
        userId: USER,
        tenantId: TENANT,
        organisationId: ORG,
        region: REGION,
      })
    })

    it('rejects a token with no tenantId claim', async () => {
      const { guard } = buildGuard({}, { claims: { userId: USER } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow('missing tenantId claim')
    })

    it('rejects a token the verifier refuses', async () => {
      const { guard } = buildGuard({}, { verifyThrows: true })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer bad' } }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow(UnauthorizedException)
    })

    // A uuid column took a literal 'test-user' and every write 500'd. Absent must
    // stay absent — callers that need attribution have to say so.
    it('omits userId rather than inventing one when the token has no subject', async () => {
      const { guard } = buildGuard({}, { claims: { tenantId: TENANT } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await guard.canActivate(contextFor(req))
      expect(req.tenantContext).toEqual({ tenantId: TENANT, region: REGION })
    })
  })

  describe('header fallback', () => {
    it('is refused when disabled, even with a well-formed tenant header', async () => {
      const { guard } = buildGuard({ allowHeaderFallback: false })
      const req: RequestShape = { url: '/v1/plans', headers: { 'x-tenant-id': TENANT } }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow('Authentication required')
    })

    it('is accepted when enabled', async () => {
      const { guard } = buildGuard({ allowHeaderFallback: true })
      const req: RequestShape = {
        url: '/v1/plans',
        headers: { 'x-tenant-id': TENANT, 'x-organisation-id': ORG, 'x-user-id': USER },
      }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
      expect(req.tenantContext).toEqual({
        userId: USER,
        tenantId: TENANT,
        organisationId: ORG,
        region: REGION,
      })
    })

    it('still refuses when enabled but no tenant header is sent', async () => {
      const { guard } = buildGuard({ allowHeaderFallback: true })
      const req: RequestShape = { url: '/v1/plans', headers: {} }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow('Authentication required')
    })

    it('never calls the verifier — a header request must not reach the IdP', async () => {
      const { guard, verifier } = buildGuard({ allowHeaderFallback: true })
      const req: RequestShape = { url: '/v1/plans', headers: { 'x-tenant-id': TENANT } }

      await guard.canActivate(contextFor(req))
      expect(verifier.verify).not.toHaveBeenCalled()
    })
  })

  describe('region', () => {
    it('stamps the serving region onto every authenticated request', async () => {
      const { guard } = buildGuard()
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await guard.canActivate(contextFor(req))
      expect((req.tenantContext as { region: string }).region).toBe(REGION)
    })

    // Data residency is a legal boundary. A request that reached the wrong
    // region must be refused, not served.
    it('refuses a tenant whose home region is elsewhere', async () => {
      const { guard } = buildGuard({}, { claims: { tenantId: TENANT, homeRegion: 'us-east-1' } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow(ForbiddenException)
    })

    // 403 not 401: the caller IS authenticated, and a fresh token would not help.
    it('refuses with 403 rather than 401, since re-authenticating would not help', async () => {
      const { guard } = buildGuard({}, { claims: { tenantId: TENANT, homeRegion: 'us-east-1' } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).rejects.toMatchObject({ status: 403 })
    })

    it('allows a tenant whose home region matches', async () => {
      const { guard } = buildGuard({}, { claims: { tenantId: TENANT, homeRegion: REGION } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    })

    // Supabase does not emit the claim today, so this is the live path: absent
    // means "no opinion", not "wrong region".
    it('allows a token with no home-region claim at all', async () => {
      const { guard } = buildGuard({}, { claims: { tenantId: TENANT } })
      const req: RequestShape = { url: '/v1/plans', headers: { authorization: 'Bearer token' } }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    })

    it('stamps the region on header-authenticated requests too', async () => {
      const { guard } = buildGuard({ allowHeaderFallback: true })
      const req: RequestShape = { url: '/v1/plans', headers: { 'x-tenant-id': TENANT } }

      await guard.canActivate(contextFor(req))
      expect(req.tenantContext).toEqual({ tenantId: TENANT, region: REGION })
    })
  })

  describe('path prefixes', () => {
    it('bypasses configured public prefixes', async () => {
      const { guard } = buildGuard({ publicPathPrefixes: ['/health'] })
      const req: RequestShape = { url: '/health/ready?verbose=1', headers: {} }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    })

    it('bypasses configured internal prefixes', async () => {
      const { guard } = buildGuard({ internalPathPrefixes: ['/v1/internal/'] })
      const req: RequestShape = { url: '/v1/internal/stats', headers: {} }

      await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    })

    it('matches on the path only, so a query string cannot smuggle a prefix', async () => {
      const { guard } = buildGuard({ publicPathPrefixes: ['/health'] })
      const req: RequestShape = { url: '/v1/plans?next=/health', headers: {} }

      await expect(guard.canActivate(contextFor(req))).rejects.toThrow('Authentication required')
    })
  })
})

describe('InternalSecretGuard', () => {
  const original = process.env['NODE_ENV']
  const secret = 'shared-secret-value'

  beforeEach(() => {
    process.env['NODE_ENV'] = 'production'
    process.env['INTERNAL_SECRET'] = secret
  })

  afterEach(() => {
    if (original === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = original
    delete process.env['INTERNAL_SECRET']
  })

  const call = (headers: Record<string, string | undefined>) =>
    new InternalSecretGuard().canActivate(contextFor({ headers }))

  it('accepts a matching secret', () => {
    expect(call({ 'x-internal-secret': secret })).toBe(true)
  })

  it('rejects a missing secret', () => {
    expect(() => call({})).toThrow(UnauthorizedException)
  })

  it('rejects a wrong secret', () => {
    expect(() => call({ 'x-internal-secret': 'nope' })).toThrow(UnauthorizedException)
  })

  // The digest comparison must not blow up on differing lengths — timingSafeEqual
  // throws on mismatched buffers, which would surface as a 500 rather than a 401.
  it('rejects a secret of a different length without throwing a non-auth error', () => {
    expect(() => call({ 'x-internal-secret': 'x' })).toThrow(UnauthorizedException)
  })

  // This must NOT relax in development: run-all.sh sets NODE_ENV=development, and
  // these routes have no other authenticator.
  it('stays closed in development', () => {
    process.env['NODE_ENV'] = 'development'
    expect(() => call({})).toThrow(UnauthorizedException)
  })

  it('refuses when the platform has no secret configured at all', () => {
    delete process.env['INTERNAL_SECRET']
    expect(() => call({ 'x-internal-secret': 'anything' })).toThrow('not configured')
  })
})

describe('resolveRegion', () => {
  const originalRegion = process.env['CLUBSPARK_REGION']
  const originalEnv = process.env['NODE_ENV']

  afterEach(() => {
    if (originalRegion === undefined) delete process.env['CLUBSPARK_REGION']
    else process.env['CLUBSPARK_REGION'] = originalRegion
    if (originalEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = originalEnv
  })

  it('uses CLUBSPARK_REGION when set', () => {
    process.env['CLUBSPARK_REGION'] = 'us-east-1'
    process.env['NODE_ENV'] = 'production'
    expect(resolveRegion()).toBe('us-east-1')
  })

  // No global default. A deployment that forgets to declare its region must not
  // silently inherit one — the symptom would be data served from the wrong
  // jurisdiction, which is a legal problem rather than an outage.
  it('throws in production when unset', () => {
    delete process.env['CLUBSPARK_REGION']
    process.env['NODE_ENV'] = 'production'
    expect(() => resolveRegion()).toThrow('CLUBSPARK_REGION is not set')
  })

  // Fail closed: an unset or misspelled NODE_ENV demands the variable rather
  // than assuming one, same allowlist as the header fallback.
  it('throws when NODE_ENV is unset', () => {
    delete process.env['CLUBSPARK_REGION']
    delete process.env['NODE_ENV']
    expect(() => resolveRegion()).toThrow('CLUBSPARK_REGION is not set')
  })

  it('defaults in test and development so a local .env need not set it', () => {
    delete process.env['CLUBSPARK_REGION']
    for (const env of ['test', 'development']) {
      process.env['NODE_ENV'] = env
      expect(resolveRegion()).toBe('eu-west-2')
    }
  })
})
