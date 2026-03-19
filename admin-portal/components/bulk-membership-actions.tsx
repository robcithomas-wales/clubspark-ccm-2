"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

type Customer = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

interface Props {
  memberships: any[]
  customers: Customer[]
  customerMap: Map<string, Customer>
  isRenewalTab?: boolean
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 ring-amber-200",
  active:    "bg-emerald-100 text-emerald-700 ring-emerald-200",
  suspended: "bg-orange-100 text-orange-700 ring-orange-200",
  lapsed:    "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-200",
  expired:   "bg-slate-200 text-slate-600 ring-slate-300",
}

const PAYMENT_BADGE: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-700",
  part_paid: "bg-amber-100 text-amber-700",
  failed:    "bg-rose-100 text-rose-700",
  waived:    "bg-sky-100 text-sky-700",
  unpaid:    "bg-slate-100 text-slate-600",
}

function formatLabel(value?: string | null) {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function customerName(c?: Customer | null) {
  if (!c) return "Unknown"
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed"
}

const BULK_ACTIONS = [
  { label: "Activate", action: "activate" },
  { label: "Suspend", action: "suspend" },
  { label: "Cancel", action: "cancel" },
  { label: "Mark as Lapsed", action: "lapse" },
]

export function BulkMembershipActions({ memberships, customerMap, isRenewalTab }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState("")
  const [bulkReason, setBulkReason] = useState("")
  const [applying, setApplying] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null)

  const allSelected = memberships.length > 0 && selected.size === memberships.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(memberships.map((m) => m.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function applyBulk() {
    if (!bulkAction || selected.size === 0) return
    setApplying(true)
    setBulkError(null)
    setBulkResult(null)
    try {
      const res = await fetch("/api/memberships/bulk-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          action: bulkAction,
          reason: bulkReason || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBulkError(json?.message ?? `Error ${res.status}`)
        return
      }
      const results: { id: string; success: boolean }[] = json.data ?? []
      const success = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length
      setBulkResult({ success, failed })
      setSelected(new Set())
      setBulkAction("")
      setBulkReason("")
      router.refresh()
    } catch (e: any) {
      setBulkError(e?.message ?? "Unknown error")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div>
      {/* Bulk action bar — shown when items are selected */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-900">
            {selected.size} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="">— Choose action —</option>
            {BULK_ACTIONS.map((a) => (
              <option key={a.action} value={a.action}>{a.label}</option>
            ))}
          </select>
          {bulkAction && (
            <input
              type="text"
              placeholder="Reason (optional)"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
          )}
          <button
            onClick={applyBulk}
            disabled={!bulkAction || applying}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-blue-700 underline"
          >
            Clear
          </button>
          {bulkError && (
            <span className="text-sm text-rose-700">{bulkError}</span>
          )}
          {bulkResult && (
            <span className="text-sm text-emerald-700">
              {bulkResult.success} updated{bulkResult.failed > 0 ? `, ${bulkResult.failed} failed` : ""}
            </span>
          )}
        </div>
      )}

      {/* List with checkboxes */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {memberships.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          {isRenewalTab
            ? "No memberships are due for renewal in the next 30 days."
            : "No memberships found."}
        </div>
      ) : (
          <div className="divide-y divide-slate-100">
            {/* Select-all header */}
            <div className="flex items-center gap-3 bg-slate-50 px-6 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="text-xs font-medium text-slate-500">Select all</span>
            </div>

            {memberships.map((m: any) => {
              const customer = m.customerId ? customerMap.get(m.customerId) : null
              const statusCls = STATUS_BADGE[m.status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
              const paymentCls = PAYMENT_BADGE[m.paymentStatus] ?? "bg-slate-100 text-slate-600"
              const isChecked = selected.has(m.id)

              return (
                <div
                  key={m.id}
                  className={`group flex items-center gap-3 px-6 py-4 transition ${isChecked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Link
                    href={`/membership/memberships/${m.id}`}
                    className="flex flex-1 items-center justify-between gap-4 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {customerName(customer)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {m.planName ?? "Unknown plan"}
                        </span>
                        {m.membershipType && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            {formatLabel(m.membershipType)}
                          </span>
                        )}
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusCls}`}>
                          {formatLabel(m.status)}
                        </span>
                        {m.paymentStatus && (
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentCls}`}>
                            {formatLabel(m.paymentStatus)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>Start: {formatDate(m.startDate)}</span>
                        {m.renewalDate && <span>Renews: {formatDate(m.renewalDate)}</span>}
                        {m.price != null && (
                          <span>{m.currency ?? "GBP"} {Number(m.price).toFixed(2)}{m.pricingModel === "recurring" && m.billingInterval ? ` / ${m.billingInterval}` : ""}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
