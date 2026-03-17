"use client"

import * as React from "react"

type DeleteMembershipButtonProps = {
  action: () => void | Promise<void>
}

export function DeleteMembershipButton({
  action,
}: DeleteMembershipButtonProps) {
  const [isPending, startTransition] = React.useTransition()

  return (
    <button
      type="button"
      onClick={() => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this membership? This action cannot be undone."
        )

        if (!confirmed) return

        startTransition(() => {
          void action()
        })
      }}
      disabled={isPending}
      className="inline-flex items-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
    >
      {isPending ? "Deleting..." : "Delete Membership"}
    </button>
  )
}