"use client"

import { useState } from "react"
import { Percent } from "lucide-react"

interface EntitlementItem {
  entitlementPolicyId?: string
  configuration?: Record<string, unknown>
  entitlementPolicy?: { policyType?: string | null }
}

interface Props {
  planId: string
  entitlements: EntitlementItem[]
}

export function EditMemberDiscountPanel({ planId, entitlements }: Props) {
  const existing = entitlements.find(
    (e) => e.entitlementPolicy?.policyType === "booking_discount",
  )
  const existingValue =
    typeof existing?.configuration?.discountValue === "number"
      ? existing.configuration.discountValue
      : null

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(existingValue != null ? String(existingValue) : "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<number | null>(existingValue)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const parsed = value === "" ? null : parseFloat(value)
    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setError("Discount must be between 0 and 100")
      setSaving(false)
      return
    }
    try {
      const res = await fetch(`/api/membership-plans/${planId}/discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountValue: parsed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? `Error ${res.status}`)
        return
      }
      setCurrent(parsed)
      setOpen(false)
    } catch (e: any) {
      setError(e?.message ?? "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#B7BBC1] bg-white">
      <div className="flex items-center justify-between border-b border-[#B7BBC1] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1B3D]">Member Booking Discount</h3>
          <p className="mt-0.5 text-xs text-[#868B97]">
            Percentage discount applied to the rack rate when a member books.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm font-medium text-[#0F1B3D] shadow-sm transition hover:bg-slate-50"
          >
            <Percent className="h-4 w-4" />
            {current != null ? "Edit" : "Set discount"}
          </button>
        )}
      </div>

      {!open && (
        <div className="px-6 py-4">
          {current != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-[#0F1B3D]">{current}%</span>
              <span className="text-sm text-[#868B97]">off rack rate for active members</span>
            </div>
          ) : (
            <p className="text-sm text-[#868B97]">No member discount configured for this plan.</p>
          )}
        </div>
      )}

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#868B97]">
              Discount percentage
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="e.g. 20"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-48 rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 pr-8 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#868B97]">%</span>
            </div>
            <p className="mt-1 text-xs text-[#868B97]">
              Leave blank to remove the discount. Members with an active plan will receive this discount on every booking.
            </p>
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
              {saving ? "Saving…" : "Save discount"}
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
