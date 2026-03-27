"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Trophy, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useOrg } from "@/lib/org-context"
import { fetchPublicCompetition, submitCompetitionEntry, type Competition } from "@/lib/api"

export default function EnterCompetitionPage() {
  const org = useOrg()
  const { id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const primary = org.primaryColour

  const [user, setUser] = useState<any>(null)
  const [comp, setComp] = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push(`/${org.slug}/login`); return }
      setUser(data.user)
      // Pre-fill display name from user metadata
      const name = data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? ""
      setDisplayName(name)
      const c = await fetchPublicCompetition(org.tenantId, id)
      if (!c) { router.push(`/${org.slug}/competitions`); return }
      if (c.status !== "REGISTRATION_OPEN") { router.push(`/${org.slug}/competitions/${id}`); return }
      setComp(c)
      if (c.divisions?.[0]) setDivisionId(c.divisions[0].id)
      setLoading(false)
    })
  }, [org.tenantId, org.slug, id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comp || !user) return
    setSubmitting(true)
    setError("")
    try {
      await submitCompetitionEntry(org.tenantId, id, {
        displayName: displayName.trim(),
        personId: user.id,
        ...(divisionId ? { divisionId } : {}),
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? "Failed to submit entry")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={28} />
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Entry submitted!</h1>
        <p className="mt-2 text-slate-500">Your entry for <strong>{comp?.name}</strong> has been received. You&apos;ll be notified once it&apos;s confirmed.</p>
        <Link
          href={`/${org.slug}/competitions/${id}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow"
          style={{ backgroundColor: primary }}
        >
          View competition
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link href={`/${org.slug}/competitions/${id}`} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft size={14} /> Back to competition
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: primary + "18" }}>
              <Trophy size={20} style={{ color: primary }} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Enter competition</h1>
              <p className="text-sm text-slate-500">{comp?.name}</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Your name *</label>
              <input
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Name that will appear on the draw"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
              <p className="mt-1 text-xs text-slate-400">This name will be shown on the draw and standings.</p>
            </div>

            {comp?.divisions && comp.divisions.length > 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Division</label>
                <select
                  value={divisionId}
                  onChange={e => setDivisionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  {comp.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {comp?.entryFee && Number(comp.entryFee) > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Entry fee: <strong>£{Number(comp.entryFee).toFixed(2)}</strong> — payment will be arranged separately by the club.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !displayName.trim()}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white shadow transition hover:shadow-md disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {submitting ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Submit entry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
