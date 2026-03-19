"use client"

import { useState } from "react"
import { Settings } from "lucide-react"

interface Props {
  planId: string
  gracePeriodDays?: number | null
  termsAndConditions?: string | null
}

export function EditPlanConfigPanel({ planId, gracePeriodDays, termsAndConditions }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    gracePeriodDays: gracePeriodDays != null ? String(gracePeriodDays) : "",
    termsAndConditions: termsAndConditions ?? "",
  })

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/membership-plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gracePeriodDays: form.gracePeriodDays ? Number(form.gracePeriodDays) : null,
          termsAndConditions: form.termsAndConditions || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? `Error ${res.status}`)
        return
      }
      setOpen(false)
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  const hasConfig = gracePeriodDays != null || termsAndConditions

  return (
    <div className="overflow-hidden rounded-2xl border border-[#B7BBC1] bg-white">
      <div className="flex items-center justify-between border-b border-[#B7BBC1] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1B3D]">Plan Configuration</h3>
          <p className="mt-0.5 text-xs text-[#868B97]">Grace period and terms & conditions for this plan.</p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm font-medium text-[#0F1B3D] shadow-sm transition hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            {hasConfig ? "Edit" : "Configure"}
          </button>
        )}
      </div>

      {!open && hasConfig && (
        <div className="space-y-4 px-6 py-4">
          {gracePeriodDays != null && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Grace Period</div>
              <div className="mt-1 text-sm text-[#0F1B3D]">{gracePeriodDays} day{gracePeriodDays !== 1 ? "s" : ""} after expiry before access is revoked</div>
            </div>
          )}
          {termsAndConditions && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Terms & Conditions</div>
              <p className="mt-1 whitespace-pre-line text-sm text-[#0F1B3D]">{termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {!open && !hasConfig && (
        <div className="px-6 py-4 text-sm text-[#868B97]">
          No grace period or terms configured for this plan.
        </div>
      )}

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#868B97]">
              Grace period <span className="font-normal">(days after expiry)</span>
            </label>
            <input
              type="number"
              min={0}
              max={365}
              placeholder="e.g. 14"
              value={form.gracePeriodDays}
              onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))}
              className="w-full rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
            />
            <p className="mt-1 text-xs text-[#868B97]">
              Members retain access for this many days after their membership expires. Leave blank for no grace period.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#868B97]">Terms & Conditions</label>
            <textarea
              rows={6}
              placeholder="Enter the terms and conditions members must agree to when joining this plan…"
              value={form.termsAndConditions}
              onChange={(e) => setForm((f) => ({ ...f, termsAndConditions: e.target.value }))}
              className="w-full rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-[#1832A8] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0F1B3D] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save configuration"}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              className="inline-flex items-center rounded-xl border border-[#B7BBC1] bg-white px-4 py-2 text-sm font-medium text-[#0F1B3D] transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
