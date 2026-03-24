"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

const SPORTS = [
  { value: "football", label: "Football" },
  { value: "cricket", label: "Cricket" },
  { value: "rugby", label: "Rugby" },
  { value: "hockey", label: "Hockey" },
  { value: "netball", label: "Netball" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "other", label: "Other" },
]

const CHARGE_RULES = [
  { value: "per_game", label: "Per game" },
  { value: "season", label: "Season fee" },
  { value: "none", label: "No automatic charging" },
]

export default function NewTeamPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    sport: "football",
    season: "",
    ageGroup: "",
    gender: "",
    defaultMatchFee: "",
    juniorMatchFee: "",
    substituteMatchFee: "",
    chargeRule: "per_game",
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sport: form.sport,
          season: form.season || undefined,
          ageGroup: form.ageGroup || undefined,
          gender: form.gender || undefined,
          defaultMatchFee: form.defaultMatchFee ? Number(form.defaultMatchFee) : undefined,
          juniorMatchFee: form.juniorMatchFee ? Number(form.juniorMatchFee) : undefined,
          substituteMatchFee: form.substituteMatchFee ? Number(form.substituteMatchFee) : undefined,
          chargeRule: form.chargeRule || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Failed to create team")
      }
      const { data } = await res.json()
      router.push(`/teams/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
  const labelClass = "block text-sm font-medium text-slate-700"

  return (
    <PortalLayout title="Create team" description="Set up a new squad with its sport, season and fee schedule.">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Core details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Team details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Team name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. First XI, Under-18s, Reserves"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Sport *</label>
              <select
                required
                value={form.sport}
                onChange={(e) => set("sport", e.target.value)}
                className={inputClass}
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Season</label>
              <input
                value={form.season}
                onChange={(e) => set("season", e.target.value)}
                placeholder="e.g. 2024/25"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Age group</label>
              <input
                value={form.ageGroup}
                onChange={(e) => set("ageGroup", e.target.value)}
                placeholder="e.g. Senior, U18, U14"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Gender</label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className={inputClass}
              >
                <option value="">— Not specified —</option>
                <option value="mixed">Mixed</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </section>

        {/* Fee schedule */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
            Match fees
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Default fees used when initiating a charge run. Leave blank for no automatic charging.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Default match fee (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.defaultMatchFee}
                onChange={(e) => set("defaultMatchFee", e.target.value)}
                placeholder="e.g. 10.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Junior match fee (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.juniorMatchFee}
                onChange={(e) => set("juniorMatchFee", e.target.value)}
                placeholder="e.g. 5.00"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Substitute fee (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.substituteMatchFee}
                onChange={(e) => set("substituteMatchFee", e.target.value)}
                placeholder="Optional — defaults to match fee"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Charge rule</label>
              <select
                value={form.chargeRule}
                onChange={(e) => set("chargeRule", e.target.value)}
                className={inputClass}
              >
                {CHARGE_RULES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1832A8] disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create team"}
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}
