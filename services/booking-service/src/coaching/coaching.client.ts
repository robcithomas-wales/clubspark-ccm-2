import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'

export interface CoachingOccupancySnapshot {
  generatedAt: string
  occupancies: Array<{
    id: string
    bookableUnitId: string
    startsAt: string
    endsAt: string
    status: string
    updatedAt: string
  }>
}

@Injectable()
export class CoachingClient {
  private readonly logger = new Logger(CoachingClient.name)
  private readonly baseUrl: string
  constructor(config: ConfigService<AppConfig, true>) {
    this.baseUrl = config.get('coachingService', { infer: true }).url
  }

  async fetchOccupancySnapshot(tenantId: string): Promise<CoachingOccupancySnapshot> {
    try {
      const headers: Record<string, string> = { 'x-tenant-id': tenantId }
      if (process.env['INTERNAL_SECRET'])
        headers['x-internal-secret'] = process.env['INTERNAL_SECRET']
      const response = await fetch(
        `${this.baseUrl}/coaching-projections/internal/booking-occupancy-snapshot`,
        {
          headers,
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok) throw new Error(`coaching-service returned ${response.status}`)
      const body = (await response.json()) as { data?: CoachingOccupancySnapshot }
      if (!body.data?.generatedAt || !Array.isArray(body.data.occupancies))
        throw new Error('invalid snapshot response')
      return body.data
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Coaching occupancy snapshot failed')
      throw new ServiceUnavailableException('Coaching occupancy snapshot is unavailable')
    }
  }
}
