import { describe, it, expect } from 'vitest'
import {
  computeForecast,
  identifyDeadSlots,
  DEAD_SLOT_THRESHOLD,
  type SlotHistoryRow,
} from '../src/forecasting/forecasting.algorithms.js'

const UNIT_A = 'unit-aaa'
const UNIT_B = 'unit-bbb'

function makeHistory(overrides: Partial<SlotHistoryRow> = {}): SlotHistoryRow {
  return {
    unitId: UNIT_A,
    dayOfWeek: 1,   // Monday
    hourSlot: 9,
    bookedWeeks: 4,
    totalWeeks: 4,
    ...overrides,
  }
}

describe('computeForecast', () => {
  it('returns 16 slots per unit per day (hours 6–21)', () => {
    const history: SlotHistoryRow[] = [makeHistory()]
    const target = new Date('2026-05-05') // Monday
    const results = computeForecast(history, target, 1)
    expect(results).toHaveLength(16)
    expect(results.every(r => r.hourSlot >= 6 && r.hourSlot <= 21)).toBe(true)
  })

  it('correctly calculates predictedOccupancy from bookedWeeks/totalWeeks', () => {
    const history: SlotHistoryRow[] = [makeHistory({ bookedWeeks: 2, totalWeeks: 4, dayOfWeek: 1, hourSlot: 9 })]
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const slot = results.find(r => r.hourSlot === 9)!
    expect(slot.predictedOccupancy).toBe(0.5)
  })

  it('marks slot as isDeadSlot when occupancy < DEAD_SLOT_THRESHOLD', () => {
    const history: SlotHistoryRow[] = [makeHistory({ bookedWeeks: 1, totalWeeks: 10, dayOfWeek: 1, hourSlot: 9 })]
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const slot = results.find(r => r.hourSlot === 9)!
    expect(slot.predictedOccupancy).toBe(0.1)
    expect(slot.isDeadSlot).toBe(true)
  })

  it('does not mark slot as dead when occupancy >= DEAD_SLOT_THRESHOLD', () => {
    const history: SlotHistoryRow[] = [makeHistory({ bookedWeeks: 4, totalWeeks: 4, dayOfWeek: 1, hourSlot: 9 })]
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const slot = results.find(r => r.hourSlot === 9)!
    expect(slot.isDeadSlot).toBe(false)
  })

  it('forecasts 0 occupancy for slots with no historical data', () => {
    const history: SlotHistoryRow[] = [makeHistory({ dayOfWeek: 3, hourSlot: 14 })] // Wednesday, not Monday
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const slot14 = results.find(r => r.hourSlot === 14)!
    expect(slot14.predictedOccupancy).toBe(0)
    expect(slot14.isDeadSlot).toBe(true)
  })

  it('handles multiple units independently', () => {
    const history: SlotHistoryRow[] = [
      makeHistory({ unitId: UNIT_A, dayOfWeek: 1, hourSlot: 9, bookedWeeks: 4, totalWeeks: 4 }),
      makeHistory({ unitId: UNIT_B, dayOfWeek: 1, hourSlot: 9, bookedWeeks: 1, totalWeeks: 4 }),
    ]
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const unitASlot = results.find(r => r.unitId === UNIT_A && r.hourSlot === 9)!
    const unitBSlot = results.find(r => r.unitId === UNIT_B && r.hourSlot === 9)!
    expect(unitASlot.predictedOccupancy).toBe(1.0)
    expect(unitBSlot.predictedOccupancy).toBe(0.25)
  })

  it('respects horizonDays — returns N days × 16 slots per unit', () => {
    const history: SlotHistoryRow[] = [makeHistory()]
    const target = new Date('2026-05-04')
    const results = computeForecast(history, target, 7)
    expect(results).toHaveLength(7 * 16)
  })

  it('zero totalWeeks results in 0 occupancy (no division by zero)', () => {
    const history: SlotHistoryRow[] = [makeHistory({ bookedWeeks: 0, totalWeeks: 0 })]
    const target = new Date('2026-05-04') // Monday
    const results = computeForecast(history, target, 1)
    const slot = results.find(r => r.hourSlot === 9)!
    expect(slot.predictedOccupancy).toBe(0)
  })

  it('DEAD_SLOT_THRESHOLD is 0.30', () => {
    expect(DEAD_SLOT_THRESHOLD).toBe(0.30)
  })
})

describe('identifyDeadSlots', () => {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  function futureDate(daysAhead: number) {
    const d = new Date(today)
    d.setDate(d.getDate() + daysAhead)
    return fmt(d)
  }

  it('returns only dead slots at least minDaysAhead ahead', () => {
    const forecasts = [
      { unitId: UNIT_A, forecastDate: futureDate(1), hourSlot: 9, predictedOccupancy: 0.1, historicalWeeks: 4, isDeadSlot: true },
      { unitId: UNIT_A, forecastDate: futureDate(3), hourSlot: 9, predictedOccupancy: 0.1, historicalWeeks: 4, isDeadSlot: true },
      { unitId: UNIT_A, forecastDate: futureDate(5), hourSlot: 9, predictedOccupancy: 0.8, historicalWeeks: 4, isDeadSlot: false },
    ]
    const dead = identifyDeadSlots(forecasts)
    expect(dead).toHaveLength(1)
    expect(dead[0].forecastDate).toBe(futureDate(3))
  })

  it('excludes non-dead slots even if far ahead', () => {
    const forecasts = [
      { unitId: UNIT_A, forecastDate: futureDate(10), hourSlot: 9, predictedOccupancy: 0.8, historicalWeeks: 4, isDeadSlot: false },
    ]
    expect(identifyDeadSlots(forecasts)).toHaveLength(0)
  })

  it('default minDaysAhead is 3', () => {
    const forecasts = [
      { unitId: UNIT_A, forecastDate: futureDate(2), hourSlot: 9, predictedOccupancy: 0.1, historicalWeeks: 4, isDeadSlot: true },
      { unitId: UNIT_A, forecastDate: futureDate(3), hourSlot: 9, predictedOccupancy: 0.1, historicalWeeks: 4, isDeadSlot: true },
    ]
    const dead = identifyDeadSlots(forecasts)
    expect(dead).toHaveLength(1)
    expect(dead[0].forecastDate).toBe(futureDate(3))
  })
})
