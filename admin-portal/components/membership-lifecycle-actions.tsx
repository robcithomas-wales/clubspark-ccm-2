"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

// State machine: which actions are available from each status
const AVAILABLE_ACTIONS: Record<string, { action: string; label: string; variant: "primary" | "warn" | "danger" }[]> = {
  pending:   [
    { action: "activate", label: "Activate", variant: "primary" },
    { action: "cancel",   label: "Cancel",   variant: "danger" },
  ],
  active:    [
    { action: "suspend",  label: "Suspend",  variant: "warn" },
    { action: "lapse",    label: "Lapse",    variant: "warn" },
    { action: "expire",   label: "Expire",   variant: "warn" },
    { action: "cancel",   label: "Cancel",   variant: "danger" },
  ],
  suspended: [
    { action: "activate", label: "Reactivate", variant: "primary" },
    { action: "lapse",    label: "Lapse",      variant: "warn" },
    { action: "cancel",   label: "Cancel",     variant: "danger" },
  ],
  lapsed:    [
    { action: "activate", label: "Reactivate", variant: "primary" },
    { action: "expire",   label: "Expire",     variant: "warn" },
    { action: "cancel",   label: "Cancel",     variant: "danger" },
  ],
  cancelled: [],
  expired:   [],
}

const VARIANT_CLASS = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  warn:    "bg-amber-100 text-amber-800 hover:bg-amber-200",
  danger:  "bg-rose-100 text-rose-700 hover:bg-rose-200",
}

export function MembershipLifecycleActions({
  membershipId,
  currentStatus,
}: {
  membershipId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const actions = AVAILABLE_ACTIONS[currentStatus] ?? []
  if (actions.length === 0) return null

  async function handleAction(action: string) {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch(`/api/memberships/${membershipId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? "Failed to update membership")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map(({ action, label, variant }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
              VARIANT_CLASS[variant],
            ].join(" ")}
          >
            {loading === action ? "Updating…" : label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
