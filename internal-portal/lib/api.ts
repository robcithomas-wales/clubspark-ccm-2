import { createClient } from '@/lib/supabase/server'
import { requireInternalSecret } from './internal-secret'

const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:4006'

async function internalHeaders(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return {
    'Content-Type': 'application/json',
    'x-internal-secret': requireInternalSecret(),
    ...(user?.id ? { 'x-staff-id': user.id } : {}),
    ...(user?.email ? { 'x-staff-email': user.email } : {}),
  }
}

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type Organisation = {
  id: string
  tenantId: string
  name: string
  slug?: string | null
  sport?: string | null
  region?: string | null
  plan: string
  status: string
  paymentConnected: boolean
  onboardingPct: number
  adminEmail?: string | null
  createdAt: string
  updatedAt: string
  featureFlags: FeatureFlag[]
  adminCount?: number
  _count?: { impersonationSessions: number }
}

export type FeatureFlag = {
  id?: string
  tenantId?: string
  flag: string
  enabled: boolean
  overrideReason?: string | null
  setByEmail?: string | null
  updatedAt?: string | null
  isOverridden?: boolean
}

export type AuditLog = {
  id: string
  staffId: string
  staffEmail?: string | null
  tenantId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  meta: Record<string, unknown>
  createdAt: string
}

export type ImpersonationSession = {
  id: string
  staffId: string
  staffEmail?: string | null
  tenantId: string
  targetUserId: string
  targetEmail?: string | null
  reason: string
  startedAt: string
  endedAt?: string | null
  status: string
  organisation?: { name: string; slug?: string | null }
}

// ── Organisations ─────────────────────────────────────────────────────────────

export async function getOrganisations(
  page = 1,
  limit = 50,
  filters: { search?: string; status?: string; plan?: string; region?: string } = {},
) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (filters.search) qs.set('search', filters.search)
  if (filters.status) qs.set('status', filters.status)
  if (filters.plan) qs.set('plan', filters.plan)
  if (filters.region) qs.set('region', filters.region)
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/organisations?${qs}`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load organisations')
  return res.json() as Promise<{ data: Organisation[]; pagination: PaginationMeta }>
}

export async function getOrganisation(tenantId: string) {
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/organisations/${tenantId}`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load organisation')
  const json = await res.json()
  return json.data as Organisation
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export async function getFlags(tenantId: string) {
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/organisations/${tenantId}/flags`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load flags')
  const json = await res.json()
  return json.data as FeatureFlag[]
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function getAuditLogs(page = 1, filters: { tenantId?: string; action?: string } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: '100' })
  if (filters.tenantId) qs.set('tenantId', filters.tenantId)
  if (filters.action) qs.set('action', filters.action)
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/audit?${qs}`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load audit log')
  return res.json() as Promise<{ data: AuditLog[]; pagination: PaginationMeta }>
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type PlatformStats = {
  totalOrgs: number
  byPlan: Record<string, number>
  byStatus: Record<string, number>
  flagAdoption: { flag: string; count: number }[]
  recentAudit: AuditLog[]
  activeImpersonations: number
}

export async function getStats() {
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/stats`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load stats')
  const json = await res.json()
  return json.data as PlatformStats
}

// ── Impersonation ─────────────────────────────────────────────────────────────

export async function getImpersonationSessions(page = 1, tenantId?: string) {
  const qs = new URLSearchParams({ page: String(page), limit: '50' })
  if (tenantId) qs.set('tenantId', tenantId)
  const res = await fetch(`${ADMIN_SERVICE}/v1/internal/impersonation?${qs}`, {
    headers: await internalHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load sessions')
  return res.json() as Promise<{ data: ImpersonationSession[]; pagination: PaginationMeta }>
}
