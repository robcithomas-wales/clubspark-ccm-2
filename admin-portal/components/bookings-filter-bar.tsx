"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"

export function BookingsFilterBar({
  status,
  fromDate,
  toDate,
}: {
  status?: string
  fromDate?: string
  toDate?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page") // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const clearAll = () => {
    router.push(pathname)
  }

  const hasActiveFilters =
    (status && status !== "all") || fromDate || toDate

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Status</label>
        <select
          value={status || "all"}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">From date</label>
        <input
          type="date"
          value={fromDate || ""}
          onChange={(e) => setParam("fromDate", e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">To date</label>
        <input
          type="date"
          value={toDate || ""}
          onChange={(e) => setParam("toDate", e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0]"
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
