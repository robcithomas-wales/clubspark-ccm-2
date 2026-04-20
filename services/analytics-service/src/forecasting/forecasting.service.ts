import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ForecastingRepository } from './forecasting.repository.js'
import { computeForecast, identifyDeadSlots } from './forecasting.algorithms.js'

const FORECAST_HORIZON_DAYS = 14

@Injectable()
export class ForecastingService {
  private readonly logger = new Logger(ForecastingService.name)

  constructor(private readonly repo: ForecastingRepository) {}

  // ── Nightly forecast computation — 02:00 AM daily ─────────────────────────

  @Cron('0 2 * * *')
  async batchForecastAllTenants(): Promise<void> {
    this.logger.log('Utilisation forecast batch starting')
    const tenantIds = await this.repo.getActiveTenantIds()
    for (const tenantId of tenantIds) {
      try {
        await this.computeForTenant(tenantId)
      } catch (err) {
        this.logger.error(`Forecast failed for tenant ${tenantId}: ${(err as Error).message}`)
      }
    }
    this.logger.log('Utilisation forecast batch complete')
  }

  async computeForTenant(tenantId: string): Promise<{ slotsComputed: number; deadSlots: number }> {
    const history = await this.repo.getSlotHistory(tenantId)
    if (history.length === 0) return { slotsComputed: 0, deadSlots: 0 }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const forecasts = computeForecast(history, tomorrow, FORECAST_HORIZON_DAYS)
    await this.repo.upsertForecasts(tenantId, forecasts)

    const dead = identifyDeadSlots(forecasts)
    return { slotsComputed: forecasts.length, deadSlots: dead.length }
  }

  async getForecasts(
    tenantId: string,
    opts: { fromDate?: string; toDate?: string; unitId?: string; deadSlotsOnly?: boolean },
  ) {
    const today = new Date().toISOString().slice(0, 10)
    const twoWeeks = new Date()
    twoWeeks.setDate(twoWeeks.getDate() + 14)

    return this.repo.getForecasts(tenantId, {
      fromDate: opts.fromDate ?? today,
      toDate: opts.toDate ?? twoWeeks.toISOString().slice(0, 10),
      unitId: opts.unitId,
      deadSlotsOnly: opts.deadSlotsOnly,
    })
  }

  async getDeadSlots(tenantId: string) {
    const slots = await this.repo.getDeadSlots(tenantId)

    // Group by unitId for easy display
    const byUnit = new Map<string, typeof slots>()
    for (const s of slots) {
      const existing = byUnit.get(s.unitId) ?? []
      existing.push(s)
      byUnit.set(s.unitId, existing)
    }

    return Array.from(byUnit.entries()).map(([unitId, unitSlots]) => ({
      unitId,
      deadSlotCount: unitSlots.length,
      lowestOccupancy: Math.min(...unitSlots.map(s => s.predictedOccupancy)),
      nextDeadSlot: unitSlots[0],
      slots: unitSlots.slice(0, 10),
    }))
  }

  async getPreviousBookers(tenantId: string, unitId: string) {
    return this.repo.getPreviousBookers(tenantId, unitId)
  }
}
