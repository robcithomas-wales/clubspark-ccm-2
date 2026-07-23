"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

export function AddParticipantForm({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    if (!name.trim()) { setError("Name is required"); return }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          participantName: name.trim(),
          participantEmail: email.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setName("")
      setEmail("")
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add participant")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Participant name" className={`${inputCls} w-full`} />
      </div>
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email (optional)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com" className={`${inputCls} w-full`} />
      </div>
      <div className="pb-0">
        <button onClick={add} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50 h-[38px]">
          <UserPlus className="h-4 w-4" />
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <div className="w-full text-sm text-red-600">{error}</div>}
    </div>
  )
}
