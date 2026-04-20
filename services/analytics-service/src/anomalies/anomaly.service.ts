import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AnomalyRepository } from './anomaly.repository.js'

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name)

  constructor(private readonly repo: AnomalyRepository) {}

  // ── Nightly anomaly detection — 03:00 AM daily ────────────────────────────

  @Cron('0 3 * * *')
  async batchDetectAllTenants(): Promise<void> {
    this.logger.log('Anomaly detection batch starting')
    const tenantIds = await this.repo.getActiveTenantIds()
    for (const tenantId of tenantIds) {
      try {
        await this.runDetection(tenantId)
      } catch (err) {
        this.logger.error(`Anomaly detection failed for tenant ${tenantId}: ${(err as Error).message}`)
      }
    }
    this.logger.log('Anomaly detection batch complete')
  }

  async runDetection(tenantId: string): Promise<{ flagged: number }> {
    const [dormant, payments, hoarding, durations] = await Promise.all([
      this.repo.detectDormantSpikes(tenantId),
      this.repo.detectPaymentFailureSpikes(tenantId),
      this.repo.detectCourtHoarding(tenantId),
      this.repo.detectExtremeDurations(tenantId),
    ])

    const allFlags = [...dormant, ...payments, ...hoarding, ...durations]
    const inserted = await this.repo.upsertFlags(tenantId, allFlags)

    this.logger.log(`Tenant ${tenantId}: ${allFlags.length} anomalies detected, ${inserted} new flags`)
    return { flagged: inserted }
  }

  async listAnomalies(
    tenantId: string,
    page: number,
    limit: number,
    opts: { unresolvedOnly?: boolean; severity?: string } = {},
  ) {
    const { data, total } = await this.repo.listFlags(tenantId, {
      page,
      limit,
      unresolvedOnly: opts.unresolvedOnly ?? true,
      severity: opts.severity,
    })

    const totalPages = Math.ceil(total / limit)
    return {
      data,
      pagination: { page, limit, total, totalPages },
    }
  }

  async resolveAnomaly(tenantId: string, id: string): Promise<void> {
    await this.repo.resolveFlag(tenantId, id)
  }
}
