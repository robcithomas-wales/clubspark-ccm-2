import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/** Display fields booking renders for a customer. Nothing else is needed. */
export interface PersonDisplay {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

/** The customer columns booking attaches to a booking row. */
export interface CustomerFields {
  customerFirstName: string | null
  customerLastName: string | null
  customerEmail: string | null
  customerPhone: string | null
}

const EMPTY: CustomerFields = {
  customerFirstName: null,
  customerLastName: null,
  customerEmail: null,
  customerPhone: null,
}

const TIMEOUT_MS = 5_000

/**
 * Reads customer display data from people-service.
 *
 * Replaces the `LEFT JOIN people.persons` / `LEFT JOIN auth.users` that used to
 * sit inside booking's own SQL. Those joins made two things impossible:
 *
 *   1. Regional deployment — a single query cannot span `booking.*` and
 *      `people.*` once they live in separate regional databases.
 *   2. Running on Azure at all — `auth.users` is Supabase-owned and does not
 *      exist on Azure Database for PostgreSQL.
 *
 * See docs/roadmap/multi-region-readiness-backlog.md (MR-1).
 *
 * Degrades to blank fields rather than failing: a booking list should still
 * render if people-service is briefly unavailable. Callers get the booking data
 * either way.
 */
@Injectable()
export class PeopleClient {
  private readonly logger = new Logger(PeopleClient.name)
  private readonly baseUrl: string
  private readonly internalSecret: string

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('peopleService.url') ?? 'http://localhost:4004'
    this.internalSecret = process.env['INTERNAL_SECRET'] ?? ''
  }

  /**
   * Fetch display fields for many customers at once.
   *
   * Batch by design — booking lists are paginated, and a per-row lookup would be
   * an N+1 across the page. Returns a Map so callers can hydrate rows directly.
   */
  async getDisplayFields(
    tenantId: string,
    customerIds: (string | null)[],
  ): Promise<Map<string, CustomerFields>> {
    const ids = [...new Set(customerIds.filter((id): id is string => Boolean(id)))]
    const map = new Map<string, CustomerFields>()
    if (ids.length === 0) return map

    try {
      const headers: Record<string, string> = {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      }
      if (this.internalSecret) headers['x-internal-secret'] = this.internalSecret

      const res = await fetch(`${this.baseUrl}/people/internal/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!res.ok) {
        this.logger.warn(
          { status: res.status, count: ids.length },
          'people-service batch lookup failed — booking rows will render without customer details',
        )
        return map
      }

      const body = (await res.json()) as { data?: PersonDisplay[] }
      for (const p of body.data ?? []) {
        map.set(p.id, {
          customerFirstName: p.firstName ?? null,
          customerLastName: p.lastName ?? null,
          customerEmail: p.email ?? null,
          customerPhone: p.phone ?? null,
        })
      }
      return map
    } catch (err) {
      this.logger.warn(
        { err: String(err), count: ids.length },
        'people-service unreachable — booking rows will render without customer details',
      )
      return map
    }
  }

  /**
   * Attach customer fields to rows that carry a `customerId`.
   *
   * A customer with no person record gets blanks. Note this drops the old
   * Supabase `auth.users` fallback, which used to derive a name from auth
   * metadata when no person row existed — people-service is now the sole source
   * of customer identity, which is what makes booking portable off Supabase.
   */
  async hydrate<T extends { customerId: string | null }>(
    tenantId: string,
    rows: T[],
  ): Promise<(T & CustomerFields)[]> {
    if (rows.length === 0) return []
    const map = await this.getDisplayFields(
      tenantId,
      rows.map((r) => r.customerId),
    )
    return rows.map((r) => ({
      ...r,
      ...(r.customerId ? (map.get(r.customerId) ?? EMPTY) : EMPTY),
    }))
  }
}
