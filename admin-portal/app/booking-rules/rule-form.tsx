"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { X, Plus } from "lucide-react"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type PurposePrice = { purpose: string; price: string; currency: string }

type FormState = {
  name: string
  description: string
  subjectType: string
  subjectRef: string
  scopeType: string
  scopeId: string
  daysOfWeek: number[]
  timeFrom: string
  timeTo: string
  canBook: boolean
  requiresApproval: boolean
  advanceDays: string
  minSlotMinutes: string
  maxSlotMinutes: string
  bookingPeriodDays: string
  maxBookingsPerPeriod: string
  allowSeries: boolean
  pricePerSlot: string
  priceCurrency: string
  minParticipants: string
  maxParticipants: string
  priority: string
  isActive: boolean
  purposePrices: PurposePrice[]
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    subjectType: "everyone",
    subjectRef: "",
    scopeType: "organisation",
    scopeId: "",
    daysOfWeek: [],
    timeFrom: "",
    timeTo: "",
    canBook: true,
    requiresApproval: false,
    advanceDays: "",
    minSlotMinutes: "",
    maxSlotMinutes: "",
    bookingPeriodDays: "",
    maxBookingsPerPeriod: "",
    allowSeries: true,
    pricePerSlot: "",
    priceCurrency: "GBP",
    minParticipants: "",
    maxParticipants: "",
    priority: "0",
    isActive: true,
    purposePrices: [],
  }
}

function ruleToForm(rule: any): FormState {
  return {
    name: rule.name ?? "",
    description: rule.description ?? "",
    subjectType: rule.subjectType ?? "everyone",
    subjectRef: rule.subjectRef ?? "",
    scopeType: rule.scopeType ?? "organisation",
    scopeId: rule.scopeId ?? "",
    daysOfWeek: rule.daysOfWeek ?? [],
    timeFrom: rule.timeFrom ?? "",
    timeTo: rule.timeTo ?? "",
    canBook: rule.canBook ?? true,
    requiresApproval: rule.requiresApproval ?? false,
    advanceDays: rule.advanceDays != null ? String(rule.advanceDays) : "",
    minSlotMinutes: rule.minSlotMinutes != null ? String(rule.minSlotMinutes) : "",
    maxSlotMinutes: rule.maxSlotMinutes != null ? String(rule.maxSlotMinutes) : "",
    bookingPeriodDays: rule.bookingPeriodDays != null ? String(rule.bookingPeriodDays) : "",
    maxBookingsPerPeriod:
      rule.maxBookingsPerPeriod != null ? String(rule.maxBookingsPerPeriod) : "",
    allowSeries: rule.allowSeries ?? true,
    pricePerSlot: rule.pricePerSlot != null ? String(rule.pricePerSlot) : "",
    priceCurrency: rule.priceCurrency ?? "GBP",
    minParticipants: rule.minParticipants != null ? String(rule.minParticipants) : "",
    maxParticipants: rule.maxParticipants != null ? String(rule.maxParticipants) : "",
    priority: String(rule.priority ?? 0),
    isActive: rule.isActive ?? true,
    purposePrices: (rule.purposePrices ?? []).map((p: any) => ({
      purpose: p.purpose,
      price: String(p.price),
      currency: p.currency,
    })),
  }
}

function formToPayload(form: FormState) {
  return {
    name: form.name,
    description: form.description || undefined,
    subjectType: form.subjectType,
    subjectRef: form.subjectRef || undefined,
    scopeType: form.scopeType,
    scopeId: form.scopeId || undefined,
    daysOfWeek: form.daysOfWeek,
    timeFrom: form.timeFrom || undefined,
    timeTo: form.timeTo || undefined,
    canBook: form.canBook,
    requiresApproval: form.requiresApproval,
    advanceDays: form.advanceDays ? parseInt(form.advanceDays) : undefined,
    minSlotMinutes: form.minSlotMinutes ? parseInt(form.minSlotMinutes) : undefined,
    maxSlotMinutes: form.maxSlotMinutes ? parseInt(form.maxSlotMinutes) : undefined,
    bookingPeriodDays: form.bookingPeriodDays ? parseInt(form.bookingPeriodDays) : undefined,
    maxBookingsPerPeriod: form.maxBookingsPerPeriod
      ? parseInt(form.maxBookingsPerPeriod)
      : undefined,
    allowSeries: form.allowSeries,
    pricePerSlot: form.pricePerSlot ? parseFloat(form.pricePerSlot) : undefined,
    priceCurrency: form.priceCurrency,
    minParticipants: form.minParticipants ? parseInt(form.minParticipants) : undefined,
    maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
    priority: parseInt(form.priority) || 0,
    isActive: form.isActive,
    purposePrices: form.purposePrices
      .filter((p) => p.purpose && p.price)
      .map((p) => ({ purpose: p.purpose, price: parseFloat(p.price), currency: p.currency })),
  }
}

type Props = {
  mode: "create" | "edit"
  initialRule?: any
  ruleId?: string
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? "bg-[#1832A8]" : "bg-slate-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  )
}

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#1832A8] focus:ring-1 focus:ring-[#1832A8]"

export function BookingRuleForm({ mode, initialRule, ruleId }: Props) {
  const router = useRouter()
  const [form, setForm] = React.useState<FormState>(
    initialRule ? ruleToForm(initialRule) : emptyForm()
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleDay(day: number) {
    set(
      "daysOfWeek",
      form.daysOfWeek.includes(day)
        ? form.daysOfWeek.filter((d) => d !== day)
        : [...form.daysOfWeek, day].sort()
    )
  }

  function addPurposePrice() {
    set("purposePrices", [...form.purposePrices, { purpose: "", price: "", currency: form.priceCurrency }])
  }

  function updatePurposePrice(i: number, field: keyof PurposePrice, value: string) {
    const next = form.purposePrices.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
    set("purposePrices", next)
  }

  function removePurposePrice(i: number) {
    set("purposePrices", form.purposePrices.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError("Rule name is required.")
      return
    }
    setIsSubmitting(true)
    try {
      const payload = formToPayload(form)
      const url = mode === "create" ? "/api/booking-rules" : `/api/booking-rules/${ruleId}`
      const method = mode === "create" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.message ?? json?.error ?? "Failed to save rule.")
        return
      }
      const savedId = json?.data?.id ?? ruleId
      router.push(savedId ? `/booking-rules/${savedId}` : "/booking-rules")
      router.refresh()
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!ruleId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/booking-rules/${ruleId}`, { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        setError("Failed to delete rule.")
        return
      }
      router.push("/booking-rules")
      router.refresh()
    } catch {
      setError("Something went wrong.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl">
      {/* ── Identity ── */}
      <section className="space-y-4">
        <SectionHeader label="Rule" title="Identity" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Rule name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Adult member – tennis courts"
              className={inputCls}
            />
          </Field>
          <Field label="Priority" hint="Higher number wins when multiple rules match.">
            <input
              type="number"
              min={0}
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Description">
          <input
            type="text"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional description"
            className={inputCls}
          />
        </Field>
        <Toggle
          checked={form.isActive}
          onChange={(v) => set("isActive", v)}
          label="Rule is active"
        />
      </section>

      {/* ── Subject ── */}
      <section className="space-y-4">
        <SectionHeader label="Who" title="Subject — who this rule applies to" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Subject type">
            <select
              value={form.subjectType}
              onChange={(e) => set("subjectType", e.target.value)}
              className={inputCls}
            >
              <option value="everyone">Everyone (public / default)</option>
              <option value="role">Role (coach, junior, committee…)</option>
              <option value="membership_plan">Membership plan</option>
              <option value="membership_scheme">Membership scheme</option>
            </select>
          </Field>
          {form.subjectType !== "everyone" && (
            <Field
              label={
                form.subjectType === "role"
                  ? "Role name"
                  : form.subjectType === "membership_plan"
                  ? "Membership plan ID"
                  : "Membership scheme ID"
              }
            >
              <input
                type="text"
                value={form.subjectRef}
                onChange={(e) => set("subjectRef", e.target.value)}
                placeholder={form.subjectType === "role" ? "e.g. coach" : "Plan or scheme ID"}
                className={inputCls}
              />
            </Field>
          )}
        </div>
      </section>

      {/* ── Scope ── */}
      <section className="space-y-4">
        <SectionHeader label="Where" title="Scope — what this rule applies to" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Scope type">
            <select
              value={form.scopeType}
              onChange={(e) => set("scopeType", e.target.value)}
              className={inputCls}
            >
              <option value="organisation">Venue-wide (all resources)</option>
              <option value="resource_group">Resource group</option>
              <option value="resource">Specific resource</option>
            </select>
          </Field>
          {form.scopeType !== "organisation" && (
            <Field
              label={form.scopeType === "resource_group" ? "Resource group ID" : "Resource ID"}
            >
              <input
                type="text"
                value={form.scopeId}
                onChange={(e) => set("scopeId", e.target.value)}
                placeholder="ID of the group or resource"
                className={inputCls}
              />
            </Field>
          )}
        </div>
      </section>

      {/* ── Schedule ── */}
      <section className="space-y-4">
        <SectionHeader
          label="When"
          title="Schedule — optional day/time filter"
        />
        <p className="text-sm text-slate-500">
          Leave blank to apply this rule at all times. Fill in to restrict to specific days or slot
          times (e.g. Monday 3–4pm only).
        </p>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Days of week</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day, i) => {
              const active = form.daysOfWeek.includes(i)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#1832A8] text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {day}
                </button>
              )
            })}
            {form.daysOfWeek.length > 0 && (
              <button
                type="button"
                onClick={() => set("daysOfWeek", [])}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Slot starts at or after">
            <input
              type="time"
              value={form.timeFrom}
              onChange={(e) => set("timeFrom", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Slot starts before">
            <input
              type="time"
              value={form.timeTo}
              onChange={(e) => set("timeTo", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* ── Access ── */}
      <section className="space-y-4">
        <SectionHeader label="Access" title="Booking access control" />
        <div className="space-y-3">
          <Toggle
            checked={form.canBook}
            onChange={(v) => set("canBook", v)}
            label="Can book (turn off to block this subject from booking)"
          />
          <Toggle
            checked={form.requiresApproval}
            onChange={(v) => set("requiresApproval", v)}
            label="Booking requires admin approval"
          />
        </div>
      </section>

      {/* ── Booking window ── */}
      <section className="space-y-4">
        <SectionHeader label="Window" title="Booking window &amp; limits" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Days in advance"
            hint="How many days ahead the user can book. Leave blank for unlimited."
          >
            <input
              type="number"
              min={0}
              value={form.advanceDays}
              onChange={(e) => set("advanceDays", e.target.value)}
              placeholder="e.g. 14"
              className={inputCls}
            />
          </Field>
          <Field
            label="Booking period (days)"
            hint="Rolling period used to count max bookings."
          >
            <input
              type="number"
              min={1}
              value={form.bookingPeriodDays}
              onChange={(e) => set("bookingPeriodDays", e.target.value)}
              placeholder="e.g. 7"
              className={inputCls}
            />
          </Field>
          <Field label="Max bookings per period">
            <input
              type="number"
              min={1}
              value={form.maxBookingsPerPeriod}
              onChange={(e) => set("maxBookingsPerPeriod", e.target.value)}
              placeholder="e.g. 5"
              className={inputCls}
            />
          </Field>
          <Field label="Min slot duration (minutes)">
            <input
              type="number"
              min={15}
              step={15}
              value={form.minSlotMinutes}
              onChange={(e) => set("minSlotMinutes", e.target.value)}
              placeholder="e.g. 60"
              className={inputCls}
            />
          </Field>
          <Field label="Max slot duration (minutes)">
            <input
              type="number"
              min={15}
              step={15}
              value={form.maxSlotMinutes}
              onChange={(e) => set("maxSlotMinutes", e.target.value)}
              placeholder="e.g. 120"
              className={inputCls}
            />
          </Field>
        </div>
        <Toggle
          checked={form.allowSeries}
          onChange={(v) => set("allowSeries", v)}
          label="Allow recurring / block bookings"
        />
      </section>

      {/* ── Pricing ── */}
      <section className="space-y-4">
        <SectionHeader label="Pricing" title="Price per slot" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Price per slot" hint="Leave blank if pricing is not controlled by this rule.">
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.pricePerSlot}
              onChange={(e) => set("pricePerSlot", e.target.value)}
              placeholder="e.g. 12.00"
              className={inputCls}
            />
          </Field>
          <Field label="Currency">
            <select
              value={form.priceCurrency}
              onChange={(e) => set("priceCurrency", e.target.value)}
              className={inputCls}
            >
              <option value="GBP">GBP £</option>
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
            </select>
          </Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">
            Purpose-based price overrides
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Set a different price when the booking purpose is match, training, etc.
          </p>
          <div className="space-y-2">
            {form.purposePrices.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={p.purpose}
                  onChange={(e) => updatePurposePrice(i, "purpose", e.target.value)}
                  placeholder="Purpose (e.g. match)"
                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={p.price}
                  onChange={(e) => updatePurposePrice(i, "price", e.target.value)}
                  placeholder="Price"
                  className="h-9 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                />
                <select
                  value={p.currency}
                  onChange={(e) => updatePurposePrice(i, "currency", e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none"
                >
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
                <button
                  type="button"
                  onClick={() => removePurposePrice(i)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPurposePrice}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add purpose price
            </button>
          </div>
        </div>
      </section>

      {/* ── Capacity ── */}
      <section className="space-y-4">
        <SectionHeader label="Capacity" title="Participant limits" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Min participants">
            <input
              type="number"
              min={1}
              value={form.minParticipants}
              onChange={(e) => set("minParticipants", e.target.value)}
              placeholder="e.g. 1"
              className={inputCls}
            />
          </Field>
          <Field label="Max participants">
            <input
              type="number"
              min={1}
              value={form.maxParticipants}
              onChange={(e) => set("maxParticipants", e.target.value)}
              placeholder="e.g. 4"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
            ? "Create rule"
            : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/booking-rules")}
          className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="ml-auto inline-flex h-10 items-center rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete rule"}
          </button>
        )}
      </div>
    </form>
  )
}
