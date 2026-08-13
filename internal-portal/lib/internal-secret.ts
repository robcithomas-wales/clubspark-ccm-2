/**
 * The shared secret authenticating this portal to admin-service's internal API.
 *
 * There is deliberately no default. This portal drives the cross-tenant admin
 * plane — staff impersonation, per-tenant feature flags, account administration,
 * the audit trail — and the guard on the other side is fail-closed, so a wrong
 * value produces a silent 401 rather than an error that explains itself.
 *
 * A committed fallback (ten files previously defaulted to a well-known dev
 * string) is worse than a loud failure: anyone who set a service's secret to
 * that value, or deployed with it, would hand over that plane. Throwing is the
 * point.
 *
 * Set this to the same value the services use — the one in the repository-root
 * `.env` that `npm run setup:env` distributes.
 */
export function requireInternalSecret(): string {
  const secret = process.env['INTERNAL_SECRET']
  if (!secret) {
    throw new Error(
      'INTERNAL_SECRET is not set. Copy the value from the repository-root .env ' +
        'into internal-portal/.env.local — the internal admin API is fail-closed, ' +
        'so without it every request 401s with no explanation.',
    )
  }
  return secret
}
