'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"

const SPORTS = ["tennis", "football", "squash", "padel", "badminton", "hockey", "cricket", "netball", "basketball", "rugby"]
const SCOPES = [
  { value: "ALL_TIME", label: "All-time" },
  { value: "SEASON", label: "Season" },
  { value: "COMPETITION", label: "Competition" },
]
const ALGORITHMS = [
  { value: "ELO", label: "ELO Rating", description: "Best for individual sports. Accounts for opponent strength." },
  { value: "POINTS_TABLE", label: "Points Table", description: "Best for team sports. Win = N pts, draw = 1 pt, loss = 0." },
]

export default function NewRankingConfigPage() {
  const router = useRouter()
  const [sport, setSport] = useState("tennis")
  const [scope, setScope] = useState("ALL_TIME")
  const [algorithm, setAlgorithm] = useState("ELO")
  const [season, setSeason] = useState("")
  const [pointsPerWin, setPointsPerWin] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/rankings/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, scope, algorithm, season: scope === "SEASON" ? season : undefined, pointsPerWin }),
      })
      if (!res.ok) throw new Error("Failed to create config")
      const json = await res.json()
      router.push(`/rankings?config=${json.data.id}`)
    } catch {
      setError("Failed to create ranking config. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout title="New Ranking Config" description="Set up a new ranking system for a sport.">
      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700">Sport</label>
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#1857E0] focus:outline-none"
            >
              {SPORTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Algorithm</label>
            <div className="mt-1.5 space-y-2">
              {ALGORITHMS.map(a => (
                <label key={a.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${algorithm === a.value ? "border-[#1857E0] bg-[#1857E0]/5" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="algorithm" value={a.value} checked={algorithm === a.value} onChange={e => { setAlgorithm(e.target.value); if (e.target.value === "ELO") setScope("ALL_TIME") }} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.label}</div>
                    <div className="text-xs text-slate-500">{a.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Scope</label>
            <div className="mt-1.5 flex gap-2">
              {SCOPES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScope(s.value)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${scope === s.value ? "border-[#1857E0] bg-[#1857E0] text-white" : "border-slate-200 text-slate-600 hover:border-[#1857E0]/30"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {scope === "SEASON" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">Season</label>
              <input
                value={season}
                onChange={e => setSeason(e.target.value)}
                placeholder="e.g. 2026 Spring"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#1857E0] focus:outline-none"
              />
            </div>
          )}

          {algorithm === "POINTS_TABLE" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">Points per win</label>
              <input
                type="number"
                min={1}
                max={10}
                value={pointsPerWin}
                onChange={e => setPointsPerWin(Number(e.target.value))}
                className="mt-1.5 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#1857E0] focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#1857E0] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1245b5] disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create Config"}
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
