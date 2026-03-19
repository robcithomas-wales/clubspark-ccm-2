"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"

interface EligibilityRules {
  minAge?: number | null
  maxAge?: number | null
  requiresExistingMembership?: boolean
  requiredPlanCodes?: string[]
  notes?: string | null
}

interface Props {
  planId: string
  initial: EligibilityRules
}

export function EditPlanEligibilityPanel({ planId, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<EligibilityRules>({
    minAge: initial.minAge ?? null,
    maxAge: initial.maxAge ?? null,
    requiresExistingMembership: initial.requiresExistingMembership ?? false,
    requiredPlanCodes: initial.requiredPlanCodes ?? [],
    notes: initial.notes ?? null,
  })
  const [planCodesInput, setPlanCodesInput] = useState(
    (initial.requiredPlanCodes ?? []).join(", ")
  )

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: EligibilityRules = {
        minAge: form.minAge || null,
        maxAge: form.maxAge || null,
        requiresExistingMembership: form.requiresExistingMembership,
        requiredPlanCodes: planCodesInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: form.notes || null,
      }

      const res = await fetch(`/api/membership-plans/${planId}/eligibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const hasRules =
    form.minAge != null ||
    form.maxAge != null ||
    form.requiresExistingMembership ||
    (form.requiredPlanCodes?.length ?? 0) > 0 ||
    form.notes

  return (
    <div className="overflow-hidden rounded-2xl border border-[#B7BBC1] bg-white">
      <div className="flex items-center justify-between border-b border-[#B7BBC1] px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1B3D]">Eligibility Rules</h3>
          <p className="mt-0.5 text-xs text-[#868B97]">
            Restrict who can join this plan (age, existing membership, etc.).
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm font-medium text-[#0F1B3D] shadow-sm transition hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {hasRules ? "Edit" : "Configure"}
          </button>
        )}
      </div>

      {!open && hasRules && (
        <div className="grid gap-3 px-6 py-4 md:grid-cols-2 xl:grid-cols-3">
          {form.minAge != null && (
            <div className="rounded-xl border border-[#B7BBC1] bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Min Age</div>
              <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{form.minAge}</div>
            </div>
          )}
          {form.maxAge != null && (
            <div className="rounded-xl border border-[#B7BBC1] bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Max Age</div>
              <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{form.maxAge}</div>
            </div>
          )}
          {form.requiresExistingMembership && (
            <div className="rounded-xl border border-[#B7BBC1] bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Requires Membership</div>
              <div className="mt-1 text-sm font-medium text-emerald-700">Yes</div>
            </div>
          )}
          {(form.requiredPlanCodes?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-[#B7BBC1] bg-slate-50 px-4 py-3 md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Required Plan Codes</div>
              <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{form.requiredPlanCodes?.join(", ")}</div>
            </div>
          )}
          {form.notes && (
            <div className="rounded-xl border border-[#B7BBC1] bg-slate-50 px-4 py-3 xl:col-span-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#868B97]">Notes</div>
              <div className="mt-1 text-sm text-[#0F1B3D]">{form.notes}</div>
            </div>
          )}
        </div>
      )}

      {!open && !hasRules && (
        <div className="px-6 py-4 text-sm text-[#868B97]">
          No eligibility restrictions configured. All members can join this plan.
        </div>
      )}

      {open && (
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#868B97]">Min Age</label>
              <input
                type="number"
                min={0}
                max={150}
                placeholder="No minimum"
                value={form.minAge ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, minAge: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#868B97]">Max Age</label>
              <input
                type="number"
                min={0}
                max={150}
                placeholder="No maximum"
                value={form.maxAge ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, maxAge: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#868B97]">
              Required Plan Codes
              <span className="ml-1 font-normal text-[#868B97]">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CLUB-BASIC, CLUB-PREMIUM"
              value={planCodesInput}
              onChange={(e) => setPlanCodesInput(e.target.value)}
              className="w-full rounded-xl border border-[#B7BBC1] bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#1832A8]"
            />
            <p className="mt-1 text-xs text-[#868B97]">Leave blank if no existing membership is required.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.requiresExistingMembership}
              onClick={() => setForm((f) => ({ ...f, requiresExistingMembership: !f.requiresExistingMembership }))}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1832A8] focus:ring-offset-2 ${
                form.requiresExistingMembership ? "bg-[#1832A8]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.requiresExistingMembership ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div>
              <div className="text-sm font-medium text-[#0F1B3D]">Requires existing membership</div>
              <div className="text-xs text-[#868B97]">
                Member must already hold an active membership in this organisation to join this plan.
              </div>
            </div>
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#868B97]">Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional eligibility criteria or notes for staff..."
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
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
              {saving ? "Saving…" : "Save eligibility"}
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
