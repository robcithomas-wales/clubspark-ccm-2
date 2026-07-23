'use client'

import { useState } from 'react'
import { CheckCircle, Link2, Link2Off, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { OAuthConnection, AccountingSettings, AccountingSyncEntry, PaginationMeta } from '@/lib/api'

const PROVIDERS = [
  {
    id: 'xero' as const,
    name: 'Xero',
    logo: '/xero-logo.svg',
    description: 'UK-favourite cloud accounting. Authorised invoices land in Xero instantly.',
  },
  {
    id: 'quickbooks' as const,
    name: 'QuickBooks',
    logo: '/quickbooks-logo.svg',
    description: 'Intuit QuickBooks Online. Invoices and credit memos synced in real time.',
  },
]

const STATUS_COLOURS: Record<string, string> = {
  synced: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  dead: 'bg-slate-100 text-slate-500',
}

interface Props {
  initialConnections: OAuthConnection[]
  initialSettings: AccountingSettings | null
  initialSyncLog: { data: AccountingSyncEntry[]; pagination: PaginationMeta }
}

export function AccountingClient({ initialConnections, initialSettings, initialSyncLog }: Props) {
  const [connections, setConnections] = useState<OAuthConnection[]>(initialConnections)
  const [settings, setSettings] = useState<AccountingSettings | null>(initialSettings)
  const [syncLog, setSyncLog] = useState<AccountingSyncEntry[]>(initialSyncLog.data)
  const [syncMeta, setSyncMeta] = useState<PaginationMeta>(initialSyncLog.pagination)
  const [syncPage, setSyncPage] = useState(1)
  const [syncLoading, setSyncLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(!!initialSettings)
  const [showSyncLog, setShowSyncLog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Settings form state
  const [form, setForm] = useState({
    provider: initialSettings?.provider ?? '',
    revenueAccountCode: initialSettings?.revenueAccountCode ?? '',
    taxRateId: initialSettings?.taxRateId ?? '',
    invoiceMode: initialSettings?.invoiceMode ?? 'AUTHORISED',
    currencyCode: initialSettings?.currencyCode ?? 'GBP',
  })

  const connectedProviders = new Set(connections.map((c) => c.provider))

  async function handleConnect(provider: 'xero' | 'quickbooks') {
    try {
      const res = await fetch(`/api/proxy/integration/v1/connections/${provider}/connect`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get connect URL')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch {
      setError(`Failed to initiate ${provider} connection`)
    }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${provider}? Future events will not be synced.`)) return
    setDisconnecting(provider)
    try {
      await fetch(`/api/proxy/integration/v1/connections/${provider}`, { method: 'DELETE' })
      setConnections((prev) => prev.filter((c) => c.provider !== provider))
    } catch {
      setError(`Failed to disconnect ${provider}`)
    } finally {
      setDisconnecting(null)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/proxy/integration/v1/accounting/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          taxRateId: form.taxRateId || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string | string[] }
        throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Failed to save')
      }
      const saved = await res.json() as AccountingSettings
      setSettings(saved)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function loadSyncLog(page: number) {
    setSyncLoading(true)
    try {
      const res = await fetch(`/api/proxy/integration/v1/accounting/sync-log?page=${page}`)
      if (res.ok) {
        const json = await res.json() as { data: AccountingSyncEntry[]; pagination: PaginationMeta }
        setSyncLog(json.data)
        setSyncMeta(json.pagination)
        setSyncPage(page)
      }
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Provider cards */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wider">Connected Providers</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const conn = connections.find((c) => c.provider === p.id)
            const isConnected = connectedProviders.has(p.id)
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-5 ${isConnected ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-slate-900">{p.name}</span>
                      {isConnected && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                    {conn && (
                      <p className="mt-2 text-xs text-slate-400">
                        Connected {new Date(conn.connectedAt).toLocaleDateString()} · expires {new Date(conn.tokenExpiry).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(p.id)}
                      disabled={disconnecting === p.id}
                      className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                      {disconnecting === p.id ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.id)}
                      className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings form */}
      <div className="rounded-xl border border-slate-200">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800"
        >
          <span>Accounting Settings</span>
          {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSettings && (
          <div className="border-t border-slate-100 px-5 py-5 space-y-4">
            <p className="text-xs text-slate-500">Configure how ClubSpark maps financial events to your chart of accounts.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select provider</option>
                  <option value="xero">Xero</option>
                  <option value="quickbooks">QuickBooks</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Invoice Mode</label>
                <select
                  value={form.invoiceMode}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceMode: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="AUTHORISED">Authorised (posted immediately)</option>
                  <option value="DRAFT">Draft (review before posting)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Revenue Account Code</label>
                <input
                  value={form.revenueAccountCode}
                  onChange={(e) => setForm((f) => ({ ...f, revenueAccountCode: e.target.value }))}
                  placeholder="e.g. 200"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">The account code / income account ID from your accounting provider.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tax Rate ID (optional)</label>
                <input
                  value={form.taxRateId}
                  onChange={(e) => setForm((f) => ({ ...f, taxRateId: e.target.value }))}
                  placeholder="e.g. OUTPUT2 (Xero) or TAX001 (QB)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
                <input
                  value={form.currencyCode}
                  onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))}
                  placeholder="GBP"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveSettings}
                disabled={saving || !form.provider || !form.revenueAccountCode}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>

            {settings && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Settings saved — new financial events will sync automatically.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sync log */}
      <div className="rounded-xl border border-slate-200">
        <button
          onClick={() => {
            setShowSyncLog((v) => {
              if (!v) void loadSyncLog(1)
              return !v
            })
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800"
        >
          <span>Sync Log</span>
          <div className="flex items-center gap-2">
            {showSyncLog && (
              <button
                onClick={(e) => { e.stopPropagation(); void loadSyncLog(syncPage) }}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {showSyncLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showSyncLog && (
          <div className="border-t border-slate-100 px-5 py-4">
            {syncLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : syncLog.length === 0 ? (
              <p className="text-sm text-slate-400">No sync entries yet. Financial events will appear here once Xero or QuickBooks is connected and settings are saved.</p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-2 font-medium">Event</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Provider Ref</th>
                      <th className="pb-2 font-medium">Attempts</th>
                      <th className="pb-2 font-medium">Synced</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncLog.map((entry) => (
                      <tr key={entry.id} title={entry.errorMessage ?? undefined}>
                        <td className="py-2 text-slate-700">{entry.eventType}</td>
                        <td className="py-2 font-mono text-slate-500">{entry.sourceType}/{entry.sourceId.slice(0, 8)}…</td>
                        <td className="py-2">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_COLOURS[entry.status] ?? ''}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-slate-500">{entry.providerRef?.slice(0, 12) ?? '—'}</td>
                        <td className="py-2 text-slate-500">{entry.attempts}</td>
                        <td className="py-2 text-slate-400">
                          {entry.syncedAt ? new Date(entry.syncedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {syncMeta.totalPages > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      disabled={syncPage <= 1}
                      onClick={() => loadSyncLog(syncPage - 1)}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-500">Page {syncPage} of {syncMeta.totalPages}</span>
                    <button
                      disabled={syncPage >= syncMeta.totalPages}
                      onClick={() => loadSyncLog(syncPage + 1)}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
