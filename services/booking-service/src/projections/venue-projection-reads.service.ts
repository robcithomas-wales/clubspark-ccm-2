import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'
import { ProjectionsRepository, type VenueBookableUnitRead } from './projections.repository.js'

type ReadMode = 'legacy' | 'shadow' | 'projection'

/** Readiness is re-checked at most this often; it only ever flips once per tenant. */
const READY_TTL_MS = 5_000

@Injectable()
export class VenueProjectionReadsService {
  private readonly logger = new Logger(VenueProjectionReadsService.name)
  private readonly mode: ReadMode
  private readonly ready = new Map<string, { value: boolean; checkedAt: number }>()

  constructor(
    private readonly projections: ProjectionsRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    const configured = config.get('projections', { infer: true }).venueReadMode
    this.mode = configured === 'shadow' || configured === 'projection' ? configured : 'legacy'
  }

  findBookableUnit(
    tenantId: string,
    id: string,
    legacy: () => Promise<VenueBookableUnitRead | null>,
  ) {
    return this.select(
      tenantId,
      'bookable-unit',
      () => this.projections.findVenueBookableUnit(tenantId, id),
      legacy,
    )
  }

  findResourceGroupId(tenantId: string, id: string, legacy: () => Promise<string | null>) {
    return this.select(
      tenantId,
      'resource-group',
      () => this.projections.findVenueResourceGroupId(tenantId, id),
      legacy,
    )
  }

  getResourceLighting(tenantId: string, id: string, legacy: () => Promise<boolean>) {
    return this.select(
      tenantId,
      'resource-lighting',
      () => this.projections.getVenueResourceLighting(tenantId, id),
      legacy,
    )
  }

  getConflictMap(
    tenantId: string,
    unitIds: string[],
    legacy: () => Promise<Map<string, string[]>>,
  ) {
    return this.select(
      tenantId,
      'unit-conflicts',
      () => this.projections.getVenueConflictMap(tenantId, unitIds),
      legacy,
    )
  }

  /**
   * Cheap, memoised guard so an un-backfilled tenant cannot read an empty
   * projection as a definitive answer.
   */
  private async assertReady(tenantId: string): Promise<void> {
    const cached = this.ready.get(tenantId)
    if (cached && Date.now() - cached.checkedAt < READY_TTL_MS && cached.value) return

    const value = await this.projections.isSourceProjected(tenantId, 'venue')
    this.ready.set(tenantId, { value, checkedAt: Date.now() })
    if (!value) {
      throw new ServiceUnavailableException(
        'Venue projection is not populated for this tenant — backfill before enabling projection reads',
      )
    }
  }

  private async select<T>(
    tenantId: string,
    contract: string,
    projected: () => Promise<T>,
    legacy: () => Promise<T>,
  ): Promise<T> {
    if (this.mode === 'legacy') return legacy()
    if (this.mode === 'projection') {
      await this.assertReady(tenantId)
      return projected()
    }

    const legacyValue = await legacy()
    try {
      const projectedValue = await projected()
      if (this.normalise(projectedValue) !== this.normalise(legacyValue)) {
        this.logger.warn({ contract }, 'Venue projection shadow mismatch')
      }
    } catch (err) {
      this.logger.error({ contract, err: String(err) }, 'Venue projection shadow read failed')
    }
    return legacyValue
  }

  private normalise(value: unknown): string {
    if (value instanceof Map) {
      return JSON.stringify(
        [...value.entries()]
          .map(([key, values]) => [key, [...values].sort()] as const)
          .sort(([left], [right]) => left.localeCompare(right)),
      )
    }
    return JSON.stringify(value)
  }
}
