"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export function DeletePricingRuleButton({ ruleId, ruleName }: { ruleId: string; ruleName: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/pricing-rules/${ruleId}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Confirm"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-slate-400 hover:text-red-600 transition"
      title={`Delete "${ruleName}"`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
