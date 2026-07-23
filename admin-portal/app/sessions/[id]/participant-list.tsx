"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const PARTICIPANT_STATUS = ["registered", "attended", "cancelled", "no_show"]
const PAYMENT_STATUS = ["unpaid", "paid", "refunded"]

const STATUS_STYLE: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  attended: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400 line-through",
  no_show: "bg-red-100 text-red-600",
}
const PAY_STYLE: Record<string, string> = {
  unpaid: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-slate-100 text-slate-500",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

interface Props {
  participants: any[]
  sessionId: string
}

export function ParticipantList({ participants, sessionId }: Props) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function update(participantId: string, dto: { status?: string; paymentStatus?: string }) {
    setUpdating(participantId)
    try {
      await fetch(`/api/sessions/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-participant", participantId, ...dto }),
      })
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  if (participants.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-slate-400">
        No participants yet. Add one below or share the session link.
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {participants.map((p: any) => (
        <div key={p.id} className={`flex items-center gap-4 px-5 py-3 ${p.status === "cancelled" ? "opacity-50" : ""}`}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{p.participantName}</div>
            {p.participantEmail && <div className="text-xs text-slate-500">{p.participantEmail}</div>}
            <div className="text-xs text-slate-400">Joined {formatDate(p.joinedAt)}</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={p.status}
              disabled={updating === p.id}
              onChange={(e) => update(p.id, { status: e.target.value })}
              className={`rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer ${STATUS_STYLE[p.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {PARTICIPANT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={p.paymentStatus}
              disabled={updating === p.id}
              onChange={(e) => update(p.id, { paymentStatus: e.target.value })}
              className={`rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer ${PAY_STYLE[p.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}
            >
              {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}
