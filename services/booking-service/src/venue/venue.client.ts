import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** The venue columns booking attaches to a booking row. */
export interface VenueFields {
  venueName: string | null
  resourceName: string | null
  unitName: string | null
}

const EMPTY: VenueFields = { venueName: null, resourceName: null, unitName: null }

const TIMEOUT_MS = 5_000

interface NamedRow {
  id: string
  name: string | null
}

/**
 * Reads venue reference data from venue-service.
 *
 * Replaces the `LEFT JOIN venue.venues / venue.resources / venue.bookable_units`
 * that used to sit inside booking's own SQL. A single query cannot span
 * `booking.*` and `venue.*` once they live in separate regional databases — see
 * docs/roadmap/multi-region-readiness-backlog.md (MR-3).
 *
 * One request carries all three id lists: booking needs all three to render a
 * row, and three round trips per page would be worse than the JOIN being
 * removed.
 *
 * Degrades to blank names rather than failing. A booking list should still
 * render if venue-service is briefly unavailable — the booking data is booking's
 * own, and only the labels are missing.
 */
@Injectable()
export class VenueClient {
  private readonly logger = new Logger(VenueClient.name)
  private readonly baseUrl: string
  private readonly internalSecret: string

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('venueService.url') ?? 'http://localhost:4003'
    this.internalSecret = process.env['INTERNAL_SECRET'] ?? ''
  }

  /**
   * Attach venue/resource/unit names to rows carrying those ids.
   *
   * Rows keep their booking data regardless; only the labels depend on this call.
   */
  async hydrate<
    T extends {
      venueId?: string | null
      resourceId?: string | null
      bookableUnitId?: string | null
    },
  >(tenantId: string, rows: T[]): Promise<(T & VenueFields)[]> {
    if (rows.length === 0) return []

    const ids = (pick: (r: T) => string | null | undefined) => [
      ...new Set(rows.map(pick).filter((v): v is string => Boolean(v))),
    ]
    const venueIds = ids((r) => r.venueId)
    const resourceIds = ids((r) => r.resourceId)
    const bookableUnitIds = ids((r) => r.bookableUnitId)

    const lookup = await this.fetchNames(tenantId, { venueIds, resourceIds, bookableUnitIds })

    return rows.map((r) => ({
      ...r,
      venueName: r.venueId ? (lookup.venues.get(r.venueId) ?? null) : null,
      resourceName: r.resourceId ? (lookup.resources.get(r.resourceId) ?? null) : null,
      unitName: r.bookableUnitId ? (lookup.units.get(r.bookableUnitId) ?? null) : null,
    }))
  }

  private async fetchNames(
    tenantId: string,
    body: { venueIds: string[]; resourceIds: string[]; bookableUnitIds: string[] },
  ): Promise<{
    venues: Map<string, string>
    resources: Map<string, string>
    units: Map<string, string>
  }> {
    const empty = { venues: new Map(), resources: new Map(), units: new Map() }
    if (!body.venueIds.length && !body.resourceIds.length && !body.bookableUnitIds.length)
      return empty

    try {
      const headers: Record<string, string> = {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      }
      if (this.internalSecret) headers['x-internal-secret'] = this.internalSecret

      const res = await fetch(`${this.baseUrl}/venue-reference/internal/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        this.logger.warn(
          { status: res.status },
          'venue-service reference lookup failed — rows will render without venue names',
        )
        return empty
      }

      const json = (await res.json()) as {
        data?: { venues?: NamedRow[]; resources?: NamedRow[]; bookableUnits?: NamedRow[] }
      }
      const toMap = (xs?: NamedRow[]) =>
        new Map((xs ?? []).map((x) => [x.id, x.name ?? ''] as const))

      return {
        venues: toMap(json.data?.venues),
        resources: toMap(json.data?.resources),
        units: toMap(json.data?.bookableUnits),
      }
    } catch (err) {
      this.logger.warn(
        { err: String(err) },
        'venue-service unreachable — rows will render without venue names',
      )
      return empty
    }
  }

  /** Blank fields, for callers that need the shape when there is nothing to hydrate. */
  static empty(): VenueFields {
    return { ...EMPTY }
  }
}
