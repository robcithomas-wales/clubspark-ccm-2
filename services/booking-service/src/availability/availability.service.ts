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

interface VenueAvailabilityConfig {
  opensAt: string           // "HH:MM"
  closesAt: string          // "HH:MM"
  slotDurationMinutes: number
  newDayReleaseTime: string | null  // "HH:MM" or null
}

const DEFAULT_CONFIG: VenueAvailabilityConfig = {
  opensAt: '06:00',
  closesAt: '22:00',
  slotDurationMinutes: 60,
  newDayReleaseTime: null,
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
    const dayOfWeek = new Date(date).getDay()

    // Fetch units and venue availability config in parallel
    const [units, config] = await Promise.all([
      this.fetchUnitsForVenue(venueId),
      this.fetchVenueConfig(venueId, dayOfWeek),
    ])

    const { opensAt, closesAt, slotDurationMinutes, newDayReleaseTime } = config

    const dayStart = `${date}T00:00:00Z`
    const dayEnd = `${date}T23:59:59Z`

    // One DB call to get all bookings for the day
    const bookings = await this.repo.getBookingsForDay(ctx.tenantId, venueId, dayStart, dayEnd)

    const unitIds = units.map((u) => u.id)

    // ONE query for all unit conflicts — fixes the N+1
    const conflictMap = await this.repo.getConflictMapForUnits(unitIds)

    // Build slots from config (opensAt → closesAt, slotDurationMinutes intervals)
    const slots = this.buildSlots(date, opensAt, closesAt, slotDurationMinutes)

    // Determine if this date's slots have been released yet via newDayReleaseTime
    const releaseInfo = this.getReleaseInfo(date, newDayReleaseTime)

    const bookingsMs = bookings.map((b) => ({
      ...b,
      startsAtMs: new Date(b.startsAt).getTime(),
      endsAtMs: new Date(b.endsAt).getTime(),
    }))

    const unitsWithSlots = units.map((unit) => {
      const relevantUnitIds = conflictMap.get(unit.id) ?? [unit.id]

      const unitSlots = slots.map((slot) => {
        // If slots for this date haven't been released yet, mark all as unavailable
        if (!releaseInfo.released) {
          return {
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            isAvailable: false,
            releasesAt: releaseInfo.releasesAt,
            conflicts: [],
          }
        }

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

    return {
      date,
      venueId,
      config: { opensAt, closesAt, slotDurationMinutes, newDayReleaseTime },
      units: unitsWithSlots,
    }
  }

  /**
   * Build slots from opensAt to closesAt at slotDurationMinutes intervals.
   * Times are treated as clock times and appended to the date in UTC.
   */
  private buildSlots(
    date: string,
    opensAt: string,
    closesAt: string,
    durationMinutes: number,
  ) {
    const slots = []
    const openParts = opensAt.split(':').map(Number)
    const closeParts = closesAt.split(':').map(Number)
    const openH = openParts[0] ?? 6
    const openM = openParts[1] ?? 0
    const closeH = closeParts[0] ?? 22
    const closeM = closeParts[1] ?? 0
    const closeTotal = closeH * 60 + closeM

    let currentTotal = openH * 60 + openM

    while (currentTotal + durationMinutes <= closeTotal) {
      const nextTotal = currentTotal + durationMinutes

      const startsAt = `${date}T${this.minsToTime(currentTotal)}:00Z`
      const endsAt = `${date}T${this.minsToTime(nextTotal)}:00Z`

      slots.push({
        startsAt,
        endsAt,
        startsAtMs: new Date(startsAt).getTime(),
        endsAtMs: new Date(endsAt).getTime(),
      })

      currentTotal = nextTotal
    }

    return slots
  }

  private minsToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  /**
   * Determine whether slots for `date` have been released yet.
   *
   * Slots for a given date are released at newDayReleaseTime on the *previous* day.
   * e.g. newDayReleaseTime = "08:00" → tomorrow's slots open at 08:00 today.
   *
   * If no newDayReleaseTime is configured, slots are always considered released.
   * Today's slots are always released (regardless of config).
   */
  private getReleaseInfo(
    date: string,
    newDayReleaseTime: string | null,
  ): { released: boolean; releasesAt: string | null } {
    if (!newDayReleaseTime) return { released: true, releasesAt: null }

    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    // Today's own slots are always available
    if (date <= today) return { released: true, releasesAt: null }

    // For future dates: slots release at newDayReleaseTime on the day before `date`
    const releaseDateStr = new Date(
      new Date(date).getTime() - 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10)

    const relParts = newDayReleaseTime.split(':').map(Number)
    const releaseH = relParts[0] ?? 0
    const releaseM = relParts[1] ?? 0
    const releasesAt = `${releaseDateStr}T${this.minsToTime(releaseH * 60 + releaseM)}:00Z`

    const released = now >= new Date(releasesAt)
    return { released, releasesAt: released ? null : releasesAt }
  }

  /**
   * Fetch venue-level availability config for a given day of week.
   * Falls back to DEFAULT_CONFIG if the venue has no config or the fetch fails.
   */
  private async fetchVenueConfig(
    venueId: string,
    dayOfWeek: number,
  ): Promise<VenueAvailabilityConfig> {
    try {
      const res = await fetch(
        `${this.venueServiceUrl}/availability-configs?scopeType=venue&scopeId=${venueId}`,
        { headers: this.venueHeaders },
      )
      if (!res.ok) return DEFAULT_CONFIG

      const json = (await res.json()) as { data?: any[] }
      const configs: any[] = json.data ?? []

      // Prefer day-specific config over catch-all
      const daySpecific = configs.find(
        (c) => c.dayOfWeek === dayOfWeek && c.isActive !== false,
      )
      const catchAll = configs.find(
        (c) => (c.dayOfWeek === null || c.dayOfWeek === undefined) && c.isActive !== false,
      )
      const raw = daySpecific ?? catchAll

      if (!raw) return DEFAULT_CONFIG

      return {
        opensAt: raw.opensAt ?? DEFAULT_CONFIG.opensAt,
        closesAt: raw.closesAt ?? DEFAULT_CONFIG.closesAt,
        slotDurationMinutes: raw.slotDurationMinutes ?? DEFAULT_CONFIG.slotDurationMinutes,
        newDayReleaseTime: raw.newDayReleaseTime ?? null,
      }
    } catch {
      return DEFAULT_CONFIG
    }
  }

  private async fetchUnitsForVenue(venueId: string): Promise<VenueUnit[]> {
    try {
      const res = await fetch(`${this.venueServiceUrl}/venues/${venueId}/units`, {
        headers: this.venueHeaders,
      })
      if (!res.ok) return []
      const json = (await res.json()) as { data?: VenueUnit[]; units?: VenueUnit[] }
      return json.data ?? json.units ?? []
    } catch {
      return []
    }
  }
}
