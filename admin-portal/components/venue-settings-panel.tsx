"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type VenueSettings = {
  openBookings?: boolean
  addOnsEnabled?: boolean
  pendingApprovals?: boolean
  splitPayments?: boolean
  publicBookingView?: string
  clubCode?: string | null
  primaryColour?: string
  logoUrl?: string | null
  appName?: string | null
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
    clubCode: initial.clubCode ?? "",
    primaryColour: initial.primaryColour ?? "#1857E0",
    logoUrl: initial.logoUrl ?? "",
    appName: initial.appName ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: keyof VenueSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function setText(key: keyof VenueSettings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value || null }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = {
        ...settings,
        clubCode: settings.clubCode || null,
        logoUrl: settings.logoUrl || null,
        appName: settings.appName || null,
      }
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

      {/* Mobile app branding */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Mobile App Branding
        </h2>
        <p className="mb-5 text-xs text-slate-400">
          Configure how your club appears in the mobile app. Customers enter the club code to connect to your venue.
        </p>

        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Club code</label>
            <p className="text-xs text-slate-500 mb-2">Short unique code customers type to find your club (e.g. <span className="font-mono">riverside</span>).</p>
            <input
              type="text"
              value={settings.clubCode ?? ""}
              onChange={(e) => setText("clubCode", e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="e.g. riverside"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">App name</label>
            <p className="text-xs text-slate-500 mb-2">Display name shown in the app header (defaults to venue name).</p>
            <input
              type="text"
              value={settings.appName ?? ""}
              onChange={(e) => setText("appName", e.target.value)}
              placeholder="e.g. Riverside Tennis"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Primary colour</label>
            <p className="text-xs text-slate-500 mb-2">Brand colour used for buttons and accents in the mobile app.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColour ?? "#1857E0"}
                onChange={(e) => { setSettings((prev) => ({ ...prev, primaryColour: e.target.value })); setSaved(false) }}
                className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={settings.primaryColour ?? "#1857E0"}
                onChange={(e) => { setSettings((prev) => ({ ...prev, primaryColour: e.target.value })); setSaved(false) }}
                placeholder="#1857E0"
                className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-[#1857E0]"
              />
              <div
                className="h-8 w-8 rounded-full border border-slate-200 shadow-sm"
                style={{ backgroundColor: settings.primaryColour ?? "#1857E0" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Logo URL</label>
            <p className="text-xs text-slate-500 mb-2">Publicly accessible URL of your club logo (PNG or SVG recommended).</p>
            <input
              type="url"
              value={settings.logoUrl ?? ""}
              onChange={(e) => setText("logoUrl", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
            />
            {settings.logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-auto rounded border border-slate-200 bg-slate-50 p-1 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              </div>
            )}
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
