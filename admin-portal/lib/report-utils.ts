/**
 * Shared utilities for report pages.
 * All functions are pure / server-safe — no client imports.
 */

export type ReportRange = {
  from: Date
  to: Date
  fromStr: string
  toStr: string
}

/**
 * Parse `from` / `to` from URL search params.
 * Defaults to the last 30 days when params are absent or invalid.
 */
export function resolveReportRange(
  sp: Record<string, string | string[] | undefined>,
): ReportRange {
  const fromStr = typeof sp.from === 'string' && sp.from ? sp.from : null
  const toStr   = typeof sp.to   === 'string' && sp.to   ? sp.to   : null

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : defaultFrom
  const to   = toStr   ? new Date(`${toStr}T23:59:59`)  : new Date(`${todayStr}T23:59:59`)

  return {
    from,
    to,
    fromStr: fromStr ?? defaultFrom.toISOString().slice(0, 10),
    toStr:   toStr   ?? todayStr,
  }
}

/** Number of calendar days covered by a range (inclusive, minimum 1). */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1)
}

/** Number of months covered by a range (inclusive, minimum 1). */
export function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    1,
    (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()) +
      1,
  )
}

/** True when a date string falls within [from, to]. */
export function inRange(
  dateStr: string | null | undefined,
  from: Date,
  to: Date,
): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= from && d <= to
}

/** Human-readable label for a range, e.g. "1 Mar 2026 – 20 Mar 2026". */
export function formatDateRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
  const f = from.toLocaleDateString('en-GB', opts)
  const t = to.toLocaleDateString('en-GB', opts)
  return f === t ? f : `${f} – ${t}`
}
