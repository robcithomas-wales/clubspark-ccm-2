"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

export function ProcessRenewalsButton() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle")
  const [result, setResult] = useState<{ processed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setState("running")
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/memberships/process-renewals?withinDays=30", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? "Failed to process renewals")
      setResult(json)
      setState("done")
    } catch (e: any) {
      setError(e.message)
      setState("error")
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={state === "running"}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1832A8] disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${state === "running" ? "animate-spin" : ""}`} />
        {state === "running" ? "Processing…" : "Process auto-renewals"}
      </button>
      {state === "done" && result && (
        <span className="text-sm font-medium text-emerald-600">
          {result.processed} renewal{result.processed !== 1 ? "s" : ""} queued
        </span>
      )}
      {state === "error" && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  )
}
