import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../config/configuration.js'

export interface CoachingOccupancyEvent {
  eventId: string
  type: 'coaching.occupancy.upserted.v1' | 'coaching.occupancy.deleted.v1'
  tenantId: string
  occurredAt: string
  sourceUpdatedAt: string
  data: Record<string, unknown>
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name)
  private readonly bookingUrl: string

  constructor(config: ConfigService<AppConfig, true>) {
    this.bookingUrl = `${config.get('bookingService', { infer: true }).url}/booking-projections/internal/coaching/events`
  }

  async publish(event: CoachingOccupancyEvent): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': event.tenantId,
    }
    const secret = process.env['INTERNAL_SECRET']
    if (secret) headers['x-internal-secret'] = secret
    const response = await fetch(this.bookingUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Booking projection consumer returned ${response.status}`)
    this.logger.debug(`Published ${event.type} to Booking projection`)
  }
}
