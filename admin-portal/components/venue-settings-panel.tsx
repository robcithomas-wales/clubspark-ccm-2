"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type VenueSettings = {
  openBookings?: boolean
  addOnsEnabled?: boolean
  pendingApprovals?: boolean
  splitPayments?: boolean
  publicBookingView?: string
}

export function VenueSettingsPanel({
  venueId,
  initial,
}: {
  venueId: string
  initial: VenueSettings
}) {
  const router = useRouter()
  const [settings, setSettings] = useState<VenueSettings>({
    openBookings: initial.openBookings ?? false,
    addOnsEnabled: initial.addOnsEnabled ?? true,
    pendingApprovals: initial.pendingApprovals ?? false,
    splitPayments: initial.splitPayments ?? false,
    publicBookingView: initial.publicBookingView ?? "none",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: keyof VenueSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = { ...settings }
      const res = await fetch(`/api/venues/${venueId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to save settings")
      }
      setSaved(true)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggles: Array<{ key: keyof VenueSettings; label: string; description: string }> = [
    {
      key: "openBookings",
      label: "Open bookings",
      description: "Allow customers to make bookings without admin approval.",
    },
    {
      key: "addOnsEnabled",
      label: "Add-ons enabled",
      description: "Allow add-on products and services to be attached to bookings.",
    },
    {
      key: "pendingApprovals",
      label: "Pending approvals",
      description: "New bookings start as pending and require admin approval before confirmation.",
    },
    {
      key: "splitPayments",
      label: "Split payments",
      description: "Allow payments to be split across multiple methods or instalments.",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Feature toggles */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Venue Settings
        </h2>
        <p className="mb-5 text-xs text-slate-400">Feature toggles for this venue.</p>

        <div className="space-y-4">
          {toggles.map(({ key, label, description }) => (
            <label key={key} className="flex cursor-pointer items-start gap-4">
              <div className="mt-0.5 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!settings[key]}
                  onClick={() => toggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2 ${
                    settings[key] ? "bg-[#1857E0]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      settings[key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">{label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{description}</div>
              </div>
            </label>
          ))}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Public booking view
            </label>
            <p className="text-xs text-slate-500 mb-2">Controls what customers see on the public booking page.</p>
            <select
              value={settings.publicBookingView ?? "none"}
              onChange={(e) => { setSettings((prev) => ({ ...prev, publicBookingView: e.target.value })); setSaved(false) }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] w-full max-w-xs"
            >
              <option value="none">None (hidden)</option>
              <option value="availability">Availability only</option>
              <option value="full">Full booking</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-9 items-center rounded-xl bg-[#1857E0] px-4 text-sm font-semibold text-white transition hover:bg-[#1832A8] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Saved</span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </div>
  )
}
