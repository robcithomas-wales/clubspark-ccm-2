"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
]

const SCOPE_OPTIONS = [
  { value: "organisation", label: "Organisation (all venues)" },
  { value: "venue", label: "Venue" },
  { value: "resource", label: "Resource" },
]

interface Props {
  venues: any[]
  resources: any[]
  existing?: any
}

export function PricingRuleForm({ venues, resources, existing }: Props) {
  const router = useRouter()
  const isEdit = !!existing

  const [form, setForm] = useState({
    name: existing?.name ?? "",
    label: existing?.label ?? "",
    description: existing?.description ?? "",
    scopeType: existing?.scopeType ?? "organisation",
    scopeId: existing?.scopeId ?? "",
    daysOfWeek: existing?.daysOfWeek ?? [] as number[],
    timeFrom: existing?.timeFrom ?? "",
    timeTo: existing?.timeTo ?? "",
    ratePerHour: existing?.ratePerHour != null ? String(existing.ratePerHour) : "",
    lightingSurchargePerHour: existing?.lightingSurchargePerHour != null ? String(existing.lightingSurchargePerHour) : "",
    memberDiscountPct: existing?.memberDiscountPct != null ? String(existing.memberDiscountPct) : "",
    priority: existing?.priority != null ? String(existing.priority) : "0",
    isActive: existing?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort((a, b) => a - b),
    }))
  }

  function scopeOptions() {
    if (form.scopeType === "venue") return venues
    if (form.scopeType === "resource") return resources
    return []
  }

  function scopeLabel() {
    if (form.scopeType === "venue") return "Venue"
    if (form.scopeType === "resource") return "Resource"
    return null
  }

  async function save() {
    if (!form.name.trim() || !form.ratePerHour) {
      setError("Name and rate per hour are required.")
      return
    }
    setError(null)
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        label: form.label.trim() || undefined,
        description: form.description.trim() || undefined,
        scopeType: form.scopeType,
        scopeId: form.scopeId || undefined,
        daysOfWeek: form.daysOfWeek,
        timeFrom: form.timeFrom || undefined,
        timeTo: form.timeTo || undefined,
        ratePerHour: parseFloat(form.ratePerHour),
        lightingSurchargePerHour: form.lightingSurchargePerHour ? parseFloat(form.lightingSurchargePerHour) : undefined,
        memberDiscountPct: form.memberDiscountPct ? parseFloat(form.memberDiscountPct) : undefined,
        priority: parseInt(form.priority ?? "0", 10),
        isActive: form.isActive,
      }

      const url = isEdit ? `/api/pricing-rules/${existing.id}` : "/api/pricing-rules"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || "Save failed")
      }

      router.push("/pricing-rules")
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1"

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Name + Label */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Rule name <span className="text-red-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Peak weekday evenings" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Label <span className="font-normal normal-case text-slate-400">(shown on receipts)</span></label>
          <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Peak, Off-Peak, Evening" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional internal notes" className={inputCls} />
      </div>

      {/* Scope */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Scope</label>
          <select value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value, scopeId: "" }))}
            className={inputCls}>
            {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {scopeLabel() && (
          <div>
            <label className={labelCls}>{scopeLabel()}</label>
            <select value={form.scopeId} onChange={(e) => setForm((f) => ({ ...f, scopeId: e.target.value }))}
              className={inputCls}>
              <option value="">— select —</option>
              {scopeOptions().map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Days of week */}
      <div>
        <label className={labelCls}>Days of week <span className="font-normal normal-case text-slate-400">(empty = all days)</span></label>
        <div className="flex gap-2 flex-wrap mt-1">
          {DAYS_OF_WEEK.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition border ${
                form.daysOfWeek.includes(d.value)
                  ? "bg-[#1857E0] text-white border-[#1857E0]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {d.label}
            </button>
          ))}
          {form.daysOfWeek.length > 0 && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, daysOfWeek: [] }))}
              className="text-xs text-slate-400 hover:text-slate-700 px-1">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Time window */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>From time <span className="font-normal normal-case text-slate-400">(empty = all hours)</span></label>
          <input type="time" value={form.timeFrom} onChange={(e) => setForm((f) => ({ ...f, timeFrom: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>To time</label>
          <input type="time" value={form.timeTo} onChange={(e) => setForm((f) => ({ ...f, timeTo: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      {/* Rates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Rate per hour (£) <span className="text-red-400">*</span></label>
          <input type="number" min="0" step="0.01" value={form.ratePerHour}
            onChange={(e) => setForm((f) => ({ ...f, ratePerHour: e.target.value }))}
            placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Lighting surcharge / hr (£)</label>
          <input type="number" min="0" step="0.01" value={form.lightingSurchargePerHour}
            onChange={(e) => setForm((f) => ({ ...f, lightingSurchargePerHour: e.target.value }))}
            placeholder="0.00" className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Added when resource has lighting. Leave blank for no surcharge.</p>
        </div>
        <div>
          <label className={labelCls}>Member discount (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={form.memberDiscountPct}
            onChange={(e) => setForm((f) => ({ ...f, memberDiscountPct: e.target.value }))}
            placeholder="From membership" className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Override membership-service value. Leave blank to use it automatically.</p>
        </div>
      </div>

      {/* Priority + Active */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Priority</label>
          <input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            placeholder="0" className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">Higher value = higher priority when multiple rules match the same scope.</p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${form.isActive ? "bg-[#1857E0]" : "bg-slate-200"}`}
          >
            <span className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm text-slate-700">{form.isActive ? "Active" : "Inactive"}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create rule"}
        </button>
        <Link href="/pricing-rules" className="text-sm text-slate-500 hover:text-slate-700 transition">
          Cancel
        </Link>
      </div>
    </div>
  )
}
