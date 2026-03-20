"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X } from "lucide-react"

const LIFECYCLE_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "lapsed", label: "Lapsed" },
  { value: "churned", label: "Churned" },
]

export function PeopleSearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const search = searchParams.get("search") ?? ""
  const lifecycle = searchParams.get("lifecycle") ?? ""

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page") // reset pagination on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams],
  )

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters = search || lifecycle

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search name, email, phone…"
          defaultValue={search}
          onChange={(e) => update("search", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1857E0] focus:outline-none focus:ring-2 focus:ring-[#1857E0]/20"
          aria-label="Search people"
        />
      </div>

      <select
        value={lifecycle}
        onChange={(e) => update("lifecycle", e.target.value)}
        className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#1857E0] focus:outline-none focus:ring-2 focus:ring-[#1857E0]/20"
        aria-label="Filter by lifecycle status"
      >
        {LIFECYCLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}

      {isPending && (
        <span className="text-xs text-slate-400">Searching…</span>
      )}
    </div>
  )
}
