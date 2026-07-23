"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, UserPlus, Trash2 } from "lucide-react"

interface Participant {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: string
}

interface Props {
  bookingId: string
  initialParticipants: Participant[]
  isCancelled: boolean
}

const inputCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] w-full"

export function BookingParticipantsPanel({
  bookingId,
  initialParticipants,
  isCancelled,
}: Props) {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (!name.trim()) { setError("Name is required"); return }
    setError(null)
    setAdding(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setParticipants((prev) => [...prev, json.data])
      setName(""); setEmail(""); setPhone(""); setNotes("")
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add participant")
    } finally {
      setAdding(false)
    }
  }

  async function remove(participantId: string) {
    setRemoving(participantId)
    try {
      await fetch(`/api/bookings/${bookingId}/participants/${participantId}`, {
        method: "DELETE",
      })
      setParticipants((prev) => prev.filter((p) => p.id !== participantId))
      router.refresh()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <Users className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">
          Additional participants ({participants.length})
        </h3>
      </div>

      {/* Participant list */}
      {participants.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No additional participants recorded.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900">{p.name}</div>
                <div className="text-xs text-slate-500 space-x-2">
                  {p.email && <span>{p.email}</span>}
                  {p.phone && <span>{p.phone}</span>}
                  {p.notes && <span className="italic text-slate-400">{p.notes}</span>}
                </div>
              </div>
              {!isCancelled && (
                <button
                  onClick={() => remove(p.id)}
                  disabled={removing === p.id}
                  className="shrink-0 text-slate-400 hover:text-red-600 transition disabled:opacity-40"
                  title="Remove participant"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!isCancelled && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Add participant
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 000000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Guest, Junior"
                className={inputCls}
              />
            </div>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <button
            onClick={add}
            disabled={adding}
            className="mt-3 flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {adding ? "Adding…" : "Add participant"}
          </button>
        </div>
      )}
    </div>
  )
}
