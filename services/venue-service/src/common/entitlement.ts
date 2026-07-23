/**
 * Entitlement gate helper.
 *
 * Calls the entitlement-service to check whether an organisation has access to
 * a given feature. Hard-gated features throw a structured error that the
 * controller catches and converts to a 403. Soft-gated features (or any
 * network/service failure) are treated as allowed so venue-service never goes
 * down because entitlement-service is unavailable.
 */

export interface FeatureBlockedError {
  code: 'FEATURE_BLOCKED'
  feature: string
  upgradeRequired: string | null
}

export function isFeatureBlockedError(e: unknown): e is FeatureBlockedError {
  return typeof e === 'object' && e !== null && (e as FeatureBlockedError).code === 'FEATURE_BLOCKED'
}

export async function assertFeature(
  organisationId: string,
  feature: string,
  tenantId: string,
): Promise<void> {
  const base = process.env['ENTITLEMENT_SERVICE_URL'] ?? 'http://127.0.0.1:4013'
  const url = `${base}/v1/entitlements/check?orgId=${encodeURIComponent(organisationId)}&feature=${encodeURIComponent(feature)}`

  try {
    const res = await fetch(url, {
      headers: { 'x-tenant-id': tenantId },
      signal: AbortSignal.timeout(3000),
    })

    // If entitlement service is down or returns an unexpected error, fail open.
    if (!res.ok) return

    const body = (await res.json()) as { data?: { allowed: boolean; gate: string | null; upgradeRequired?: string | null } }
    const data = body.data

    if (data && !data.allowed && data.gate === 'hard') {
      const err: FeatureBlockedError = {
        code: 'FEATURE_BLOCKED',
        feature,
        upgradeRequired: data.upgradeRequired ?? null,
      }
      throw err
    }
  } catch (e) {
    // Re-throw our own structured errors; swallow everything else (network, timeout).
    if (isFeatureBlockedError(e)) throw e
  }
}
