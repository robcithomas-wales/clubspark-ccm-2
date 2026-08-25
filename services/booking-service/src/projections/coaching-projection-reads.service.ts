import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'
import { ProjectionsRepository } from './projections.repository.js'

@Injectable()
export class CoachingProjectionReadsService {
  private readonly logger = new Logger(CoachingProjectionReadsService.name)
  private readonly mode: 'legacy' | 'shadow' | 'projection'

  constructor(
    private readonly projections: ProjectionsRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    const mode = config.get('projections', { infer: true }).coachingReadMode
    this.mode = mode === 'shadow' || mode === 'projection' ? mode : 'legacy'
  }

  async getConflicts(
    tenantId: string,
    unitIds: string[],
    startsAt: string,
    endsAt: string,
    legacy: () => Promise<{ id: string }[]>,
  ) {
    if (this.mode === 'legacy') return legacy()
    const projected = () =>
      this.projections.getCoachingConflicts(tenantId, unitIds, startsAt, endsAt)
    if (this.mode === 'projection') return projected()
    const legacyValue = await legacy()
    try {
      const projectionValue = await projected()
      const ids = (rows: { id: string }[]) =>
        rows
          .map((row) => row.id)
          .sort()
          .join(',')
      if (ids(legacyValue) !== ids(projectionValue)) {
        this.logger.warn('Coaching projection shadow mismatch')
      }
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Coaching projection shadow read failed')
    }
    return legacyValue
  }
}
