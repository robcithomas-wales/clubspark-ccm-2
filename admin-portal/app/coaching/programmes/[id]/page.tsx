"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Users, ChevronDown, ChevronUp, CheckCircle2, XCircle, MinusCircle, Plus, Trash2 } from "lucide-react"

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-300",
  published: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  closed: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  ended: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
}

const ENROL_STATUS_COLOURS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  waitlisted: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
}

function formatDateTime(v: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v))
}

function formatDate(v?: string | null) {
  if (!v) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v))
}

type Programme = any
type Session = any
type Enrolment = any
type AttendanceRecord = any

export default function ProgrammeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [programme, setProgramme] = React.useState<Programme | null>(null)
  const [enrolments, setEnrolments] = React.useState<Enrolment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Add session form state
  const [showAddSession, setShowAddSession] = React.useState(false)
  const [sessionForm, setSessionForm] = React.useState({ startsAt: "", endsAt: "", notes: "" })
  const [addingSession, setAddingSession] = React.useState(false)

  // Enrol form
  const [showEnrol, setShowEnrol] = React.useState(false)
  const [enrolCustomerId, setEnrolCustomerId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)

  // Attendance (expanded session)
  const [expandedSession, setExpandedSession] = React.useState<string | null>(null)
  const [attendance, setAttendance] = React.useState<Record<string, AttendanceRecord[]>>({})

  async function load() {
    setLoading(true)
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/coaching/programmes/${params.id}`, { cache: "no-store" }),
        fetch(`/api/coaching/programmes/${params.id}/enrolments`, { cache: "no-store" }),
      ])
      if (!pRes.ok) { setError("Programme not found"); return }
      const pJson = await pRes.json()
      setProgramme(pJson.data)
      if (eRes.ok) {
        const eJson = await eRes.json()
        setEnrolments(eJson.data ?? [])
      }
    } catch {
      setError("Failed to load programme")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [params.id])

  async function handleTransition(action: string) {
    const res = await fetch(`/api/coaching/programmes/${params.id}/${action}`, { method: "POST" })
    if (res.ok) load()
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    setAddingSession(true)
    try {
      const res = await fetch(`/api/coaching/programmes/${params.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(sessionForm.startsAt).toISOString(),
          endsAt: new Date(sessionForm.endsAt).toISOString(),
          notes: sessionForm.notes || undefined,
        }),
      })
      if (res.ok) { setShowAddSession(false); setSessionForm({ startsAt: "", endsAt: "", notes: "" }); load() }
    } finally {
      setAddingSession(false)
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Delete this session?")) return
    await fetch(`/api/coaching/programmes/${params.id}/sessions/${sessionId}`, { method: "DELETE" })
    load()
  }

  async function handleEnrol(e: React.FormEvent) {
    e.preventDefault()
    if (!enrolCustomerId.trim()) return
    setEnrolling(true)
    try {
      const res = await fetch(`/api/coaching/programmes/${params.id}/enrolments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: enrolCustomerId.trim() }),
      })
      if (res.ok) { setShowEnrol(false); setEnrolCustomerId(""); load() }
    } finally {
      setEnrolling(false)
    }
  }

  async function handleCancelEnrolment(enrolmentId: string) {
    if (!confirm("Cancel this enrolment?")) return
    await fetch(`/api/coaching/programmes/${params.id}/enrolments/${enrolmentId}`, { method: "DELETE" })
    load()
  }

  async function loadAttendance(sessionId: string) {
    if (attendance[sessionId]) return
    const res = await fetch(`/api/coaching/programmes/${params.id}/sessions/${sessionId}/attendance`)
    if (res.ok) {
      const json = await res.json()
      setAttendance((prev) => ({ ...prev, [sessionId]: json.data ?? [] }))
    }
  }

  async function handleMarkAttendance(sessionId: string, enrolmentId: string, customerId: string, attended: boolean) {
    await fetch(`/api/coaching/programmes/${params.id}/sessions/${sessionId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrolmentId, customerId, attended }),
    })
    // Reload attendance for this session
    const res = await fetch(`/api/coaching/programmes/${params.id}/sessions/${sessionId}/attendance`)
    if (res.ok) {
      const json = await res.json()
      setAttendance((prev) => ({ ...prev, [sessionId]: json.data ?? [] }))
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>
  if (error || !programme) return <div className="p-8 text-sm text-rose-600">{error ?? "Not found"}</div>

  const sessions: Session[] = programme.sessions ?? []
  const confirmedEnrolments = enrolments.filter((e: Enrolment) => e.status === "confirmed")

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{programme.name}</h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOURS[programme.status] ?? STATUS_COLOURS.draft}`}>
              {programme.status}
            </span>
          </div>
          {programme.description && <p className="mt-1 text-sm text-slate-500">{programme.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            {programme.sport && <span className="rounded-full bg-slate-100 px-2.5 py-1">{programme.sport}</span>}
            {programme.coach && <span className="rounded-full bg-slate-100 px-2.5 py-1">Coach: {programme.coach.displayName}</span>}
            <span className="rounded-full bg-slate-100 px-2.5 py-1">£{Number(programme.price).toFixed(2)}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{confirmedEnrolments.length} / {programme.maxParticipants} enrolled</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">Enrols {formatDate(programme.enrollsFrom)} – {formatDate(programme.enrollsUntil)}</span>
          </div>
        </div>

        {/* Lifecycle actions */}
        <div className="flex flex-wrap gap-2">
          {programme.status === "draft" && (
            <button onClick={() => handleTransition("publish")} className="inline-flex h-9 items-center rounded-xl bg-[#1832A8] px-4 text-sm font-semibold text-white hover:bg-[#142a8c]">Publish</button>
          )}
          {programme.status === "published" && (
            <button onClick={() => handleTransition("close")} className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Close enrolment</button>
          )}
          {programme.status === "closed" && (
            <button onClick={() => handleTransition("end")} className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Mark ended</button>
          )}
          {["draft", "published", "closed"].includes(programme.status) && (
            <button onClick={() => handleTransition("cancel")} className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100">Cancel programme</button>
          )}
        </div>
      </div>

      {/* Sessions */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            <CalendarDays className="h-4 w-4" /> Sessions ({sessions.length})
          </h2>
          {programme.status !== "ended" && programme.status !== "cancelled" && (
            <button onClick={() => setShowAddSession((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1832A8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#142a8c]">
              <Plus className="h-3.5 w-3.5" /> Add session
            </button>
          )}
        </div>

        {showAddSession && (
          <form onSubmit={handleAddSession} className="border-b border-slate-100 bg-sky-50 px-6 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Start</label>
                <input type="datetime-local" required value={sessionForm.startsAt} onChange={(e) => setSessionForm((f) => ({ ...f, startsAt: e.target.value }))} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">End</label>
                <input type="datetime-local" required value={sessionForm.endsAt} onChange={(e) => setSessionForm((f) => ({ ...f, endsAt: e.target.value }))} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Notes</label>
                <input value={sessionForm.notes} onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={addingSession} className="inline-flex h-8 items-center rounded-lg bg-[#1832A8] px-3 text-xs font-semibold text-white disabled:opacity-60">
                {addingSession ? "Adding…" : "Add session"}
              </button>
              <button type="button" onClick={() => setShowAddSession(false)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600">Cancel</button>
            </div>
          </form>
        )}

        {sessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">No sessions yet. Add the first session above.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s: Session) => {
              const isExpanded = expandedSession === s.id
              const sessionAttendance = attendance[s.id] ?? []
              return (
                <div key={s.id}>
                  <div className="flex items-center gap-3 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{formatDateTime(s.startsAt)} – {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(s.endsAt))}</div>
                      {s.notes && <div className="mt-0.5 text-xs text-slate-500">{s.notes}</div>}
                    </div>
                    <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.status === "completed" ? "bg-emerald-50 text-emerald-700" : s.status === "cancelled" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                      {s.status}
                    </span>
                    <button
                      onClick={() => {
                        if (isExpanded) { setExpandedSession(null) } else { setExpandedSession(s.id); loadAttendance(s.id) }
                      }}
                      className="shrink-0 text-slate-400 hover:text-slate-700"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleDeleteSession(s.id)} className="shrink-0 text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Attendance</div>
                      {confirmedEnrolments.length === 0 ? (
                        <p className="text-xs text-slate-500">No confirmed enrolments to mark attendance for.</p>
                      ) : (
                        <div className="space-y-2">
                          {confirmedEnrolments.map((enr: Enrolment) => {
                            const record = sessionAttendance.find((a: AttendanceRecord) => a.enrolmentId === enr.id)
                            return (
                              <div key={enr.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2">
                                <span className="text-sm text-slate-700 font-mono">{enr.customerId.slice(0, 8)}</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleMarkAttendance(s.id, enr.id, enr.customerId, true)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${record?.attended === true ? "bg-emerald-100 text-emerald-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50"}`}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Present
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(s.id, enr.id, enr.customerId, false)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${record?.attended === false ? "bg-rose-100 text-rose-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-rose-50"}`}
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Absent
                                  </button>
                                  {record === undefined || record?.attended === null && (
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400"><MinusCircle className="h-3.5 w-3.5" /> Not recorded</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Enrolments */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Users className="h-4 w-4" /> Enrolments ({enrolments.length})
          </h2>
          {programme.status === "published" && (
            <button onClick={() => setShowEnrol((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1832A8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#142a8c]">
              <Plus className="h-3.5 w-3.5" /> Enrol customer
            </button>
          )}
        </div>

        {showEnrol && (
          <form onSubmit={handleEnrol} className="border-b border-slate-100 bg-sky-50 px-6 py-4">
            <label className="mb-1 block text-xs font-medium text-slate-700">Customer ID</label>
            <div className="flex gap-2">
              <input value={enrolCustomerId} onChange={(e) => setEnrolCustomerId(e.target.value)} placeholder="Customer UUID" className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none font-mono" />
              <button type="submit" disabled={enrolling} className="inline-flex h-9 items-center rounded-lg bg-[#1832A8] px-4 text-xs font-semibold text-white disabled:opacity-60">
                {enrolling ? "Enrolling…" : "Enrol"}
              </button>
              <button type="button" onClick={() => setShowEnrol(false)} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">Cancel</button>
            </div>
          </form>
        )}

        {enrolments.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-500">No enrolments yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {enrolments.map((enr: Enrolment) => (
              <div key={enr.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <div className="font-mono text-sm text-slate-700">{enr.customerId.slice(0, 16)}…</div>
                  <div className="mt-0.5 text-xs text-slate-400">{new Date(enr.createdAt).toLocaleDateString("en-GB")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ENROL_STATUS_COLOURS[enr.status] ?? ENROL_STATUS_COLOURS.confirmed}`}>
                    {enr.status}
                  </span>
                  {enr.status !== "cancelled" && (
                    <button onClick={() => handleCancelEnrolment(enr.id)} className="text-xs text-slate-400 hover:text-rose-600">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
