"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trash2, UserPlus } from "lucide-react"

interface Member {
  id: string
  personId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  addedAt: string
  addedBy: string | null
}

interface Props {
  segmentId: string
  initialMembers: Member[]
  isStatic: boolean
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso))
}

function fullName(m: Member) {
  return `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "Unnamed"
}

export function SegmentMemberList({ segmentId, initialMembers, isStatic }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [personId, setPersonId] = useState("")
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (!personId.trim()) return
    setError(null)
    setAdding(true)
    try {
      const res = await fetch(`/api/segments/${segmentId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: personId.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      setPersonId("")
      router.refresh()
      // Reload members
      const mRes = await fetch(`/api/segments/${segmentId}/members`)
      const mJson = await mRes.json()
      setMembers(mJson.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setAdding(false)
    }
  }

  async function remove(pid: string) {
    setRemoving(pid)
    try {
      await fetch(`/api/segments/${segmentId}/members/${pid}`, { method: "DELETE" })
      setMembers((prev) => prev.filter((m) => m.personId !== pid))
      router.refresh()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      {members.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No members yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <Link href={`/people/${m.personId}`} className="text-sm font-medium text-slate-900 hover:text-[#1857E0] transition">
                  {fullName(m)}
                </Link>
                {m.email && <div className="text-xs text-slate-500">{m.email}</div>}
                <div className="text-xs text-slate-400">
                  Added {formatDate(m.addedAt)}{m.addedBy && m.addedBy !== "system" ? ` by ${m.addedBy}` : ""}
                </div>
              </div>
              {isStatic && (
                <button
                  onClick={() => remove(m.personId)}
                  disabled={removing === m.personId}
                  className="shrink-0 text-slate-400 hover:text-red-600 transition disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isStatic && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Add person by ID</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              placeholder="Person UUID"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1857E0]"
            />
            <button
              onClick={add}
              disabled={adding || !personId.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-3 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
        </div>
      )}
    </div>
  )
}
