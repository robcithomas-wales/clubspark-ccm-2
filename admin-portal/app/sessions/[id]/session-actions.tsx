"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle, CheckCircle2 } from "lucide-react"

export function SessionActions({ sessionId, status }: { sessionId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(action: string) {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setLoading(null)
      setConfirm(null)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {status !== "completed" && (
        confirm === "complete" ? (
          <div className="flex items-center gap-2">
            <button onClick={() => act("complete")} disabled={!!loading}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 transition disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {loading === "complete" ? "Marking…" : "Confirm complete"}
            </button>
            <button onClick={() => setConfirm(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirm("complete")}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 transition">
            <CheckCircle2 className="h-4 w-4" />
            Mark complete
          </button>
        )
      )}
      {confirm === "cancel" ? (
        <div className="flex items-center gap-2">
          <button onClick={() => act("cancel")} disabled={!!loading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50">
            <XCircle className="h-4 w-4" />
            {loading === "cancel" ? "Cancelling…" : "Confirm cancel"}
          </button>
          <button onClick={() => setConfirm(null)} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
        </div>
      ) : (
        <button onClick={() => setConfirm("cancel")}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition">
          <XCircle className="h-4 w-4" />
          Cancel session
        </button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
