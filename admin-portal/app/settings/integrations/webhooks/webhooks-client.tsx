'use client'

import { useState, Fragment } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, RefreshCw, Copy, Check, X } from 'lucide-react'
import type { WebhookSubscription, WebhookDelivery, PaginationMeta } from '@/lib/api'

const EVENT_TYPES = [
  'booking.confirmed',
  'booking.cancelled',
  'booking.reminder_due',
  'membership.activated',
  'membership.renewal_due',
  'membership.expired',
  'payment.succeeded',
  'payment.failed',
  'payment.refund_issued',
  'fixture.reminder_due',
]

const STATUS_STYLES: Record<WebhookDelivery['status'], string> = {
  pending: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-amber-100 text-amber-700',
  dead: 'bg-red-100 text-red-700',
}

interface Props {
  initialSubscriptions: WebhookSubscription[]
}

export function WebhooksClient({ initialSubscriptions }: Props) {
  const [subs, setSubs] = useState<WebhookSubscription[]>(initialSubscriptions)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  const [deliveriesSubId, setDeliveriesSubId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [deliveriesMeta, setDeliveriesMeta] = useState<PaginationMeta | null>(null)
  const [deliveriesPage, setDeliveriesPage] = useState(1)
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)

  async function reload() {
    const res = await fetch('/api/proxy/integration/v1/webhook-subscriptions')
    if (res.ok) {
      const json = await res.json()
      setSubs(json.data ?? [])
    }
  }

  function openCreate() {
    setEditId(null)
    setName('')
    setEndpointUrl('')
    setEventTypes([])
    setError(null)
    setShowCreate(true)
  }

  function openEdit(sub: WebhookSubscription) {
    setEditId(sub.id)
    setName(sub.name)
    setEndpointUrl(sub.endpointUrl)
    setEventTypes(sub.eventTypes)
    setError(null)
    setShowCreate(true)
  }

  async function handleSave() {
    if (!name.trim() || !endpointUrl.trim() || eventTypes.length === 0) return
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        const res = await fetch(`/api/proxy/integration/v1/webhook-subscriptions/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), endpointUrl: endpointUrl.trim(), eventTypes }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? 'Failed to update subscription')
          throw new Error(msg)
        }
        setShowCreate(false)
        setEditId(null)
        await reload()
      } else {
        const res = await fetch('/api/proxy/integration/v1/webhook-subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), endpointUrl: endpointUrl.trim(), eventTypes }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? 'Failed to create subscription')
          throw new Error(msg)
        }
        const created = await res.json()
        setNewSecret(created.secret)
        setShowCreate(false)
        await reload()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook subscription? Pending deliveries will not be sent.')) return
    await fetch(`/api/proxy/integration/v1/webhook-subscriptions/${id}`, { method: 'DELETE' })
    await reload()
  }

  async function handleToggle(sub: WebhookSubscription) {
    await fetch(`/api/proxy/integration/v1/webhook-subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !sub.isActive }),
    })
    await reload()
  }

  async function openDeliveries(subId: string) {
    if (deliveriesSubId === subId) {
      setDeliveriesSubId(null)
      return
    }
    setDeliveriesSubId(subId)
    setDeliveriesPage(1)
    await loadDeliveries(subId, 1)
  }

  async function loadDeliveries(subId: string, page: number) {
    setDeliveriesLoading(true)
    try {
      const res = await fetch(
        `/api/proxy/integration/v1/webhook-deliveries?subscriptionId=${subId}&page=${page}`,
      )
      if (res.ok) {
        const json = await res.json()
        setDeliveries(json.data ?? [])
        setDeliveriesMeta(json.pagination ?? null)
        setDeliveriesPage(page)
      }
    } finally {
      setDeliveriesLoading(false)
    }
  }

  async function handleRetry(deliveryId: string) {
    await fetch(`/api/proxy/integration/v1/webhook-deliveries/${deliveryId}/retry`, { method: 'POST' })
    if (deliveriesSubId) await loadDeliveries(deliveriesSubId, deliveriesPage)
  }

  function toggleEventType(et: string) {
    setEventTypes((prev) => (prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]))
  }

  async function copySecret() {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  const deliveriesSub = subs.find((s) => s.id === deliveriesSubId)

  return (
    <div className="space-y-6">
      {/* Signing secret banner */}
      {newSecret && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="mb-2 text-sm font-semibold text-amber-800">
                Copy your webhook signing secret now — it won&apos;t be shown again.
              </p>
              <p className="mb-2 text-xs text-amber-700">
                Use this secret to verify the <code className="font-mono">X-ClubSpark-Signature</code> header on incoming webhook requests.
              </p>
              <code className="block break-all rounded bg-white px-3 py-2 text-xs font-mono text-slate-800 shadow-inner ring-1 ring-amber-200">
                {newSecret}
              </code>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={copySecret}
                className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
              >
                {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {secretCopied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setNewSecret(null)} className="text-amber-700 hover:text-amber-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Webhook Subscriptions</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Webhook
        </button>
      </div>

      {/* Create / edit form */}
      {showCreate && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">
            {editId ? 'Edit Webhook' : 'Create Webhook'}
          </h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NGB Booking Feed"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Endpoint URL</label>
              <input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://example.com/webhooks"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600">Event Types</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {EVENT_TYPES.map((et) => (
                <label key={et} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventTypes.includes(et)}
                    onChange={() => toggleEventType(et)}
                    className="rounded border-slate-300"
                  />
                  <span className="font-mono text-xs">{et}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !endpointUrl.trim() || eventTypes.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Webhook'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setEditId(null) }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions table */}
      {subs.length === 0 ? (
        <p className="text-sm text-slate-500">No webhook subscriptions yet. Create one to start receiving events.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Endpoint</th>
                <th className="px-4 py-3 text-left">Events</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((sub) => (
                <Fragment key={sub.id}>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{sub.name}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="block truncate font-mono text-xs text-slate-600">{sub.endpointUrl}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.eventTypes.map((et) => (
                          <span key={et} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                            {et}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(sub)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDeliveries(sub.id)}
                          title="View deliveries"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          {deliveriesSubId === sub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(sub)}
                          title="Edit"
                          className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          title="Delete"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {deliveriesSubId === sub.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 py-4">
                        <h4 className="mb-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Delivery Log — {deliveriesSub?.name}
                        </h4>
                        {deliveriesLoading ? (
                          <p className="text-sm text-slate-400">Loading…</p>
                        ) : deliveries.length === 0 ? (
                          <p className="text-sm text-slate-400">No deliveries recorded yet.</p>
                        ) : (
                          <>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="pb-2 font-medium">Status</th>
                                  <th className="pb-2 font-medium">Event</th>
                                  <th className="pb-2 font-medium">Attempts</th>
                                  <th className="pb-2 font-medium">Response</th>
                                  <th className="pb-2 font-medium">Created</th>
                                  <th className="pb-2 font-medium"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {deliveries.map((d) => (
                                  <tr key={d.id}>
                                    <td className="py-1.5">
                                      <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_STYLES[d.status]}`}>
                                        {d.status}
                                      </span>
                                    </td>
                                    <td className="py-1.5 font-mono text-slate-700">{d.eventType}</td>
                                    <td className="py-1.5 text-slate-600">{d.attempts}</td>
                                    <td className="py-1.5 text-slate-500">{d.responseCode ?? '—'}</td>
                                    <td className="py-1.5 text-slate-500">
                                      {new Date(d.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-1.5">
                                      {(d.status === 'failed' || d.status === 'dead') && (
                                        <button
                                          onClick={() => handleRetry(d.id)}
                                          title="Retry"
                                          className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {deliveriesMeta && deliveriesMeta.totalPages > 1 && (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  disabled={deliveriesPage <= 1}
                                  onClick={() => loadDeliveries(sub.id, deliveriesPage - 1)}
                                  className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                                >
                                  Prev
                                </button>
                                <span className="text-xs text-slate-500">
                                  Page {deliveriesPage} of {deliveriesMeta.totalPages}
                                </span>
                                <button
                                  disabled={deliveriesPage >= deliveriesMeta.totalPages}
                                  onClick={() => loadDeliveries(sub.id, deliveriesPage + 1)}
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
