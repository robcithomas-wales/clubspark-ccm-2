'use client'

import { Suspense, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExtraFilter = {
  key: string
  label: string
  options: { value: string; label: string }[]
}

type Props = {
  extraFilters?: ExtraFilter[]
  /** Label shown below the controls, e.g. "1 Mar – 20 Mar 2026" */
  rangeLabel?: string
}

// ─── Preset config ───────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'today',          label: 'Today' },
  { key: 'this_week',      label: 'This Week' },
  { key: 'last_week',      label: 'Last Week' },
  { key: 'this_month',     label: 'This Month' },
  { key: 'this_quarter',   label: 'This Quarter' },
  { key: 'past_6_months',  label: 'Past 6 months' },
  { key: 'this_year',      label: 'This Year' },
] as const

function presetToRange(preset: string): { from: string; to: string } {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }

    case 'this_week': {
      const d = new Date(today)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
      return { from: d.toISOString().slice(0, 10), to: todayStr }
    }

    case 'last_week': {
      const end = new Date(today)
      end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1) // prev Sunday
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
    }

    case 'this_month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: from.toISOString().slice(0, 10), to: todayStr }
    }

    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3)
      const from = new Date(today.getFullYear(), q * 3, 1)
      return { from: from.toISOString().slice(0, 10), to: todayStr }
    }

    case 'past_6_months': {
      const from = new Date(today)
      from.setMonth(from.getMonth() - 6)
      return { from: from.toISOString().slice(0, 10), to: todayStr }
    }

    case 'this_year': {
      const from = new Date(today.getFullYear(), 0, 1)
      return { from: from.toISOString().slice(0, 10), to: todayStr }
    }

    default:
      return { from: todayStr, to: todayStr }
  }
}

// ─── Inner component (needs useSearchParams — must be inside Suspense) ────────

function FiltersInner({ extraFilters = [], rangeLabel }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const sp       = useSearchParams()

  const currentFrom   = sp.get('from')   ?? ''
  const currentTo     = sp.get('to')     ?? ''
  const currentPreset = sp.get('preset') ?? ''

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k)
        else next.set(k, v)
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [router, pathname, sp],
  )

  function applyPreset(key: string) {
    const { from, to } = presetToRange(key)
    update({ preset: key, from, to })
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ preset: null, from: e.target.value })
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ preset: null, to: e.target.value })
  }

  function handleExtraChange(key: string, value: string) {
    update({ [key]: value === 'all' ? null : value })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Quick preset row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quick
        </span>
        {PRESETS.map(({ key, label }) => {
          const active = currentPreset === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#1857E0] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Date range + extras row */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Range
        </span>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={currentFrom}
            onChange={handleFromChange}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-[#1857E0] focus:outline-none focus:ring-1 focus:ring-[#1857E0]"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={currentTo}
            onChange={handleToChange}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-[#1857E0] focus:outline-none focus:ring-1 focus:ring-[#1857E0]"
          />
        </div>

        {/* Report-specific extra filters */}
        {extraFilters.map((f) => {
          const currentVal = sp.get(f.key) ?? 'all'
          return (
            <div key={f.key} className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">{f.label}:</span>
              <select
                value={currentVal}
                onChange={(e) => handleExtraChange(f.key, e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#1857E0] focus:outline-none focus:ring-1 focus:ring-[#1857E0]"
              >
                <option value="all">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}

        {/* Clear button — only shown when filters are active */}
        {(currentFrom || currentTo || currentPreset || extraFilters.some((f) => sp.has(f.key))) && (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams()
              router.replace(pathname, { scroll: false })
            }}
            className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Active range label */}
      {rangeLabel && (
        <p className="mt-2.5 text-xs text-slate-500">
          Showing data for: <span className="font-semibold text-slate-700">{rangeLabel}</span>
          <span className="ml-1.5 text-slate-400">(list data filtered · charts adjusted · all-time stats noted where applicable)</span>
        </p>
      )}
    </div>
  )
}

// ─── Public export — wraps in Suspense for useSearchParams ───────────────────

export function ReportFilters(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-[88px] animate-pulse rounded-2xl bg-slate-100" />
      }
    >
      <FiltersInner {...props} />
    </Suspense>
  )
}
