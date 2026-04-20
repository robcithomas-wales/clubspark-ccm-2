// Pure forecasting functions — no side effects, fully testable

export interface SlotHistoryRow {
  unitId: string
  dayOfWeek: number   // 0=Sunday .. 6=Saturday
  hourSlot: number    // 0-23
  bookedWeeks: number // weeks where this slot had at least one booking
  totalWeeks: number  // total weeks observed
}

export interface ForecastResult {
  unitId: string
  forecastDate: string  // YYYY-MM-DD
  hourSlot: number
  predictedOccupancy: number  // 0.0–1.0
  historicalWeeks: number
  isDeadSlot: boolean
}

export const DEAD_SLOT_THRESHOLD = 0.30

export function computeForecast(
  history: SlotHistoryRow[],
  targetDate: Date,
  horizonDays: number,
): ForecastResult[] {
  // Build lookup: unitId:dayOfWeek:hour → rate
  const lookup = new Map<string, { rate: number; weeks: number }>()
  for (const row of history) {
    const key = `${row.unitId}:${row.dayOfWeek}:${row.hourSlot}`
    lookup.set(key, {
      rate: row.totalWeeks > 0 ? row.bookedWeeks / row.totalWeeks : 0,
      weeks: row.totalWeeks,
    })
  }

  const results: ForecastResult[] = []
  const unitIds = [...new Set(history.map(r => r.unitId))]

  for (let d = 0; d < horizonDays; d++) {
    const date = new Date(targetDate)
    date.setDate(date.getDate() + d)
    const dayOfWeek = date.getDay()
    const dateStr = date.toISOString().slice(0, 10)

    for (const unitId of unitIds) {
      for (let h = 6; h < 22; h++) {
        const key = `${unitId}:${dayOfWeek}:${h}`
        const entry = lookup.get(key)
        const rate = entry?.rate ?? 0
        const weeks = entry?.weeks ?? 0

        results.push({
          unitId,
          forecastDate: dateStr,
          hourSlot: h,
          predictedOccupancy: rate,
          historicalWeeks: weeks,
          isDeadSlot: rate < DEAD_SLOT_THRESHOLD,
        })
      }
    }
  }

  return results
}

export function identifyDeadSlots(forecasts: ForecastResult[], minDaysAhead = 3): ForecastResult[] {
  const today = new Date().toISOString().slice(0, 10)
  return forecasts.filter(f => {
    if (!f.isDeadSlot) return false
    const daysAhead = Math.ceil(
      (new Date(f.forecastDate).getTime() - new Date(today).getTime()) / 86400000,
    )
    return daysAhead >= minDaysAhead
  })
}
