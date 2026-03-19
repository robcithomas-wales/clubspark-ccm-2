"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft } from "lucide-react"

interface Plan {
  id: string
  name: string
  code?: string | null
  status?: string
}

interface Props {
  membershipId: string
  currentPlanId: string
  currentPlanName: string
  plans: Plan[]
}

export function TransferMembershipPanel({ membershipId, currentPlanId, currentPlanName, plans }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [reason, setReason] = useState("")

  const availablePlans = plans.filter((p) => p.id !== currentPlanId && p.status !== "inactive")

  async function handleTransfer() {
    if (!selectedPlanId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/memberships/${membershipId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, reason: reason || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Transfer to plan</h3>
          <p className="mt-0.5 text-xs text-slate-500">Move this membership to a different plan.</p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            disabled={availablePlans.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </button>
        )}
      </div>

      {!open && (
        <div className="px-6 py-4 text-sm text-slate-500">
          Currently on <span className="font-medium text-slate-800">{currentPlanName}</span>.
          {availablePlans.length === 0 && (
            <span className="ml-1 text-slate-400">(No other plans available to transfer to.)</span>
          )}
        </div>
      )}

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Target plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="">— Select a plan —</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Reason <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Upgraded to premium plan"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTransfer}
              disabled={!selectedPlanId || saving}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Transferring…" : "Confirm transfer"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null); setSelectedPlanId(""); setReason("") }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
