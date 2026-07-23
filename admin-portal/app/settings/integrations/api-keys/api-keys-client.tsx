'use client'

import { useState, Fragment } from 'react'
import { Copy, Check, Plus, Ban, Play, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { ApiKey, ApiKeyUsageEntry, PaginationMeta } from '@/lib/api'

const SCOPES = [
  { value: 'bookings:read', label: 'Bookings — Read' },
  { value: 'members:read', label: 'Members — Read' },
  { value: 'competitions:read', label: 'Competitions — Read' },
  { value: 'teams:read', label: 'Teams — Read' },
  { value: 'webhooks:manage', label: 'Webhooks — Manage' },
]

interface Props {
  initialKeys: ApiKey[]
}

export function ApiKeysClient({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null)
  const [usageLog, setUsageLog] = useState<ApiKeyUsageEntry[]>([])
  const [usageMeta, setUsageMeta] = useState<PaginationMeta | null>(null)
  const [usagePage, setUsagePage] = useState(1)
  const [usageLoading, setUsageLoading] = useState(false)

  async function reload() {
    const res = await fetch('/api/proxy/integration/v1/api-keys')
    if (res.ok) {
      const json = await res.json()
      setKeys(json.data ?? [])
    }
  }

  async function handleCreate() {
    if (!name.trim() || selectedScopes.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/proxy/integration/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes: selectedScopes }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.message ?? 'Failed to create key')
      }
      const created = await res.json()
      setNewPlaintext(created.plaintext)
      setName('')
      setSelectedScopes([])
      setShowCreate(false)
      await reload()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleSuspend(id: string) {
    await fetch(`/api/proxy/integration/v1/api-keys/${id}/suspend`, { method: 'PATCH' })
    await reload()
  }

  async function handleActivate(id: string) {
    await fetch(`/api/proxy/integration/v1/api-keys/${id}/activate`, { method: 'PATCH' })
    await reload()
  }

  async function handleRevoke(id: string) {
    if (!confirm('Permanently revoke this API key? This cannot be undone.')) return
    await fetch(`/api/proxy/integration/v1/api-keys/${id}`, { method: 'DELETE' })
    await reload()
  }

  async function openUsage(keyId: string) {
    if (usageKeyId === keyId) {
      setUsageKeyId(null)
      return
    }
    setUsageKeyId(keyId)
    setUsagePage(1)
    await loadUsage(keyId, 1)
  }

  async function loadUsage(keyId: string, page: number) {
    setUsageLoading(true)
    try {
      const res = await fetch(`/api/proxy/integration/v1/api-keys/${keyId}/usage?page=${page}`)
      if (res.ok) {
        const json = await res.json()
        setUsageLog(json.data ?? [])
        setUsageMeta(json.pagination ?? null)
        setUsagePage(page)
      }
    } finally {
      setUsageLoading(false)
    }
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  async function copyPlaintext() {
    if (!newPlaintext) return
    await navigator.clipboard.writeText(newPlaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const usageKey = keys.find((k) => k.id === usageKeyId)

  return (
    <div className="space-y-6">
      {/* New key plaintext banner */}
      {newPlaintext && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="mb-2 text-sm font-semibold text-amber-800">
                Copy your API key now — it won&apos;t be shown again.
              </p>
              <code className="block break-all rounded bg-white px-3 py-2 text-xs font-mono text-slate-800 shadow-inner ring-1 ring-amber-200">
                {newPlaintext}
              </code>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={copyPlaintext}
                className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setNewPlaintext(null)} className="text-amber-700 hover:text-amber-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">API Keys</h2>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Key
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Create API Key</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NGB Data Feed"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">Scopes</label>
            <div className="space-y-1.5">
              {SCOPES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                    className="rounded border-slate-300"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || selectedScopes.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Key'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      {keys.length === 0 ? (
        <p className="text-sm text-slate-500">No API keys yet. Create one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Scopes</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Requests</th>
                <th className="px-4 py-3 text-left">Last Used</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((key) => (
                <Fragment key={key.id}>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{key.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          key.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {key.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{key.requestCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openUsage(key.id)}
                          title="View usage"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          {usageKeyId === key.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {key.isActive ? (
                          <button
                            onClick={() => handleSuspend(key.id)}
                            title="Suspend"
                            className="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(key.id)}
                            title="Activate"
                            className="rounded p-1 text-slate-400 hover:bg-green-50 hover:text-green-600"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRevoke(key.id)}
                          title="Revoke"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {usageKeyId === key.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-4 py-4">
                        <h4 className="mb-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Usage Log — {usageKey?.name}
                        </h4>
                        {usageLoading ? (
                          <p className="text-sm text-slate-400">Loading…</p>
                        ) : usageLog.length === 0 ? (
                          <p className="text-sm text-slate-400">No requests recorded yet.</p>
                        ) : (
                          <>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="pb-2 font-medium">Endpoint</th>
                                  <th className="pb-2 font-medium">Status</th>
                                  <th className="pb-2 font-medium">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {usageLog.map((u) => (
                                  <tr key={u.id}>
                                    <td className="py-1.5 font-mono text-slate-700">{u.endpoint}</td>
                                    <td className="py-1.5">
                                      <span
                                        className={`rounded px-1.5 py-0.5 font-medium ${
                                          u.responseCode < 300
                                            ? 'bg-green-100 text-green-700'
                                            : u.responseCode < 500
                                              ? 'bg-amber-100 text-amber-700'
                                              : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {u.responseCode}
                                      </span>
                                    </td>
                                    <td className="py-1.5 text-slate-500">
                                      {new Date(u.timestamp).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {usageMeta && usageMeta.totalPages > 1 && (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  disabled={usagePage <= 1}
                                  onClick={() => loadUsage(key.id, usagePage - 1)}
                                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                                >
                                  Prev
                                </button>
                                <span className="text-xs text-slate-500">
                                  Page {usagePage} of {usageMeta.totalPages}
                                </span>
                                <button
                                  disabled={usagePage >= usageMeta.totalPages}
                                  onClick={() => loadUsage(key.id, usagePage + 1)}
                                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
