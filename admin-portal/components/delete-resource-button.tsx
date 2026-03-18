"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteResourceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      router.push("/resources")
      router.refresh()
    } catch {
      setError("Could not delete resource. Please try again.")
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-sm text-slate-600">Delete &ldquo;{name}&rdquo;?</span>
        <button
          onClick={() => setConfirming(false)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 text-sm font-medium text-red-600 transition hover:bg-red-50"
    >
      Delete resource
    </button>
  )
}
