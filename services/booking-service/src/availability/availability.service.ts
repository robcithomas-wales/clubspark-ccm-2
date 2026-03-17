import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AvailabilityRepository } from './availability.repository.js'
import type { AppConfig } from '../config/configuration.js'
import type { TenantContext } from '../common/decorators/tenant-context.decorator.js'

interface VenueUnit {
  id: string
  tenantId?: string
  venueId?: string
  resourceId?: string
  parentUnitId?: string | null
  name: string
  unitType?: string
  sortOrder?: number
  capacity?: number | null
  isActive?: boolean
}

@Injectable()
export class AvailabilityService {
  private readonly venueServiceUrl: string
  private readonly venueHeaders: Record<string, string>

  constructor(
    private readonly repo: AvailabilityRepository,
    config: ConfigService<AppConfig, true>,
  ) {
    const vs = config.get('venueService', { infer: true })
    this.venueServiceUrl = vs.url
    this.venueHeaders = {
      'x-tenant-id': vs.defaultTenantId,
      'x-organisation-id': vs.defaultOrgId,
    }
  }

  async checkAvailability(
    ctx: TenantContext,
    bookableUnitId: string,
    startsAt: string,
    endsAt: string,
  ) {
    const conflictMap = await this.repo.getConflictMapForUnits([bookableUnitId])
    const unitIds = conflictMap.get(bookableUnitId) ?? [bookableUnitId]

    const rows = await this.repo.getOverlappingBookings(ctx.tenantId, unitIds, startsAt, endsAt)

    return {
      isAvailable: rows.length === 0,
      conflicts: rows,
    }
  }

  async getDayAvailability(ctx: TenantContext, venueId: string, date: string) {
    // One HTTP call to get all units for the venue
    const units = await this.fetchUnitsForVenue(venueId)

    const dayStart = `${date}T00:00:00Z`
    const dayEnd = `${date}T23:59:59Z`

    // One DB call to get all bookings for the day
    const bookings = await this.repo.getBookingsForDay(ctx.tenantId, venueId, dayStart, dayEnd)

    const unitIds = units.map((u) => u.id)

    // ONE query for all unit conflicts — fixes the N+1
    const conflictMap = await this.repo.getConflictMapForUnits(unitIds)

    // Build hourly slots 06:00–22:00
    const slots = this.buildHourlySlots(date)

    const bookingsMs = bookings.map((b) => ({
      ...b,
      startsAtMs: new Date(b.startsAt).getTime(),
      endsAtMs: new Date(b.endsAt).getTime(),
    }))

    const unitsWithSlots = units.map((unit) => {
      const relevantUnitIds = conflictMap.get(unit.id) ?? [unit.id]

      const unitSlots = slots.map((slot) => {
        const overlapping = bookingsMs.filter(
          (b) =>
            relevantUnitIds.includes(b.bookableUnitId) &&
            b.startsAtMs < slot.endsAtMs &&
            b.endsAtMs > slot.startsAtMs,
        )

        return {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          isAvailable: overlapping.length === 0,
          conflicts: overlapping.map((b) => ({
            id: b.id,
            bookableUnitId: b.bookableUnitId,
            bookingReference: b.bookingReference,
            startsAt: b.startsAt,
            endsAt: b.endsAt,
          })),
        }
      })

      return {
        id: unit.id,
        name: unit.name,
        unitType: unit.unitType,
        sortOrder: unit.sortOrder,
        capacity: unit.capacity,
        isActive: unit.isActive,
        slots: unitSlots,
      }
    })

    return { date, venueId, units: unitsWithSlots }
  }

  private buildHourlySlots(date: string) {
    const slots = []
    for (let hour = 6; hour < 22; hour++) {
      const hh = String(hour).padStart(2, '0')
      const next = String(hour + 1).padStart(2, '0')
      const startsAt = `${date}T${hh}:00:00Z`
      const endsAt = `${date}T${next}:00:00Z`
      slots.push({
        startsAt,
        endsAt,
        startsAtMs: new Date(startsAt).getTime(),
        endsAtMs: new Date(endsAt).getTime(),
      })
    }
    return slots
  }

  private async fetchUnitsForVenue(venueId: string): Promise<VenueUnit[]> {
    const res = await fetch(`${this.venueServiceUrl}/venues/${venueId}/units`, {
      headers: this.venueHeaders,
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch venue units: ${res.status}`)
    }

    const json = (await res.json()) as { data?: VenueUnit[]; units?: VenueUnit[] }
    return json.data ?? json.units ?? []
  }
}
