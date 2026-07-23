"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

export function SegmentRebuildButton({ segmentId }: { segmentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function rebuild() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/segments/${segmentId}/rebuild`, { method: "POST" })
      const json = await res.json()
      setResult(json.message ?? "Rebuilt")
      router.refresh()
    } catch {
      setResult("Rebuild failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={rebuild}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 transition disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Rebuilding…" : "Rebuild"}
      </button>
      {result && <span className="text-xs text-slate-500">{result}</span>}
    </div>
  )
}
