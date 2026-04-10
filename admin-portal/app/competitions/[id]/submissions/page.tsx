"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { Send, CheckCircle, XCircle, Clock } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; colour: string; icon: any }> = {
  DRAFT:        { label: "Draft",        colour: "bg-slate-100 text-slate-600",  icon: Clock },
  SUBMITTED:    { label: "Submitted",    colour: "bg-blue-100 text-blue-700",    icon: Clock },
  ACKNOWLEDGED: { label: "Acknowledged", colour: "bg-green-100 text-green-700",  icon: CheckCircle },
  REJECTED:     { label: "Rejected",     colour: "bg-red-100 text-red-700",      icon: XCircle },
}

export default function CompetitionSubmissionsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [governingBody, setGoverningBody] = useState("LTA")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadSubmissions() {
    const res = await fetch(`/api/competitions/${id}/submissions`)
    const json = await res.json()
    setSubmissions(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadSubmissions() }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/competitions/${id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governingBody }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? "Submission failed")
      setSuccess(`Competition submitted to ${json.data.governingBody}`)
      await loadSubmissions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const hasActiveSubmission = submissions.some(s => s.status === "SUBMITTED" || s.status === "ACKNOWLEDGED")

  return (
    <PortalLayout
      title="Tournament Submissions"
      description="Submit this competition to a governing body such as the LTA."
    >
      <div className="space-y-6">
        {/* Submit form */}
        {!hasActiveSubmission && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Submit to governing body</h3>
            <form onSubmit={handleSubmit} className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Governing body</label>
                <input
                  type="text"
                  value={governingBody}
                  onChange={e => setGoverningBody(e.target.value)}
                  placeholder="e.g. LTA"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1032A8] disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit competition"}
              </button>
            </form>
            {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
          </div>
        )}

        {/* Submission history */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Submission history</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((s: any) => {
                const config = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.DRAFT
                const Icon = config.icon
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.governingBody ?? "Unknown body"}</p>
                        <p className="text-xs text-slate-500">
                          Submitted {new Date(s.submittedAt ?? s.createdAt).toLocaleString()}
                          {s.externalRef && ` · Ref: ${s.externalRef}`}
                        </p>
                        {s.rejectionReason && <p className="text-xs text-red-600 mt-0.5">Reason: {s.rejectionReason}</p>}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.colour}`}>
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
