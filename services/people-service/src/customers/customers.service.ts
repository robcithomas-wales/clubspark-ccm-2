import { Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CustomersRepository } from './customers.repository.js'
import type { CreateCustomerDto } from './dto/create-customer.dto.js'
import type { UpdateCustomerDto } from './dto/update-customer.dto.js'
import type { AppConfig } from '../config/configuration.js'

/** Cap on each internal reassign call. See reassignCustomer for why this exists. */
const REASSIGN_TIMEOUT_MS = 10_000

/** A service that owns rows keyed by customer id and must be told when one moves. */
interface ServiceTarget {
  name: string
  url: string
  /**
   * Controller prefix, e.g. 'bookings' → POST {url}/bookings/internal/reassign-customer.
   *
   * Deliberately NOT prefixed with /v1: booking-service enables URI versioning
   * without a defaultVersion and its BookingsController declares no version, so
   * its routes are served unversioned; membership-service enables no versioning
   * at all. Both are reached at the bare path. (This is also why the pre-existing
   * /v1 fetches in getFinancialProfile were silently 404ing — fixed below.)
   */
  path: string
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name)
  private readonly bookingServiceUrl: string
  private readonly membershipServiceUrl: string
  private readonly internalSecret: string

  constructor(
    private readonly repo: CustomersRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.bookingServiceUrl = config.get('bookingService', { infer: true }).url
    this.membershipServiceUrl = config.get('membershipService', { infer: true }).url
    this.internalSecret = config.get('internalSecret', { infer: true })

    // Surface the misconfiguration here rather than as an opaque 401 from a
    // downstream service part-way through a merge.
    if (!this.internalSecret && process.env['NODE_ENV'] !== 'test') {
      this.logger.warn(
        'INTERNAL_SECRET is not set — service-to-service calls will be rejected by the receiving guard',
      )
    }
  }

  /**
   * Services holding a customer_id that must follow a person merge.
   * Order matters only for rollback, which walks it in reverse.
   */
  private get rehomeTargets(): ServiceTarget[] {
    return [
      { name: 'booking-service', url: this.bookingServiceUrl, path: 'bookings' },
      { name: 'membership-service', url: this.membershipServiceUrl, path: 'memberships' },
    ]
  }

  async list(tenantId: string, page: number, limit: number, search?: string, lifecycle?: string) {
    const { customers, total } = await this.repo.list(tenantId, page, limit, search, lifecycle)
    return {
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.repo.findById(tenantId, id)
    if (!customer) throw new NotFoundException('Customer not found')
    return { data: customer }
  }

  /**
   * Batch display-field lookup for other services (see CustomersRepository.findManyByIds).
   *
   * Silently skips ids that do not exist or belong to another tenant — callers are
   * hydrating a list and a missing person should leave blank fields, not fail the
   * whole request. Duplicate ids are collapsed.
   */
  async findManyByIds(tenantId: string, ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    const data = await this.repo.findManyByIds(tenantId, unique)
    return { data }
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    // If a Supabase user ID is provided, check whether this email already exists.
    // If it does, rehome the existing record to the new ID so everything stays linked.
    if (dto.id && dto.email) {
      const existing = await this.repo.findByEmail(tenantId, dto.email)
      if (existing && existing.id !== dto.id) {
        const customer = await this.rehome(tenantId, existing.id, dto.id)
        return { data: customer }
      }
      if (existing) {
        return { data: existing }
      }
    }
    const customer = await this.repo.create(tenantId, dto)
    return { data: customer }
  }

  /**
   * Moves a person from one id to another and keeps the owning services in step.
   *
   * Previously this was a single local SQL transaction that reached into
   * `booking.bookings` and `membership.memberships`. That only worked because all
   * three schemas happen to live in one database today — it becomes impossible the
   * moment those services own separate databases, which is a hard prerequisite for
   * the EU/US/AU regional split. See docs/architecture/scalability-and-multi-region.md.
   *
   * It is now a saga. Each service updates its own data through its own API, and we
   * compensate on failure. Two properties make that safe:
   *
   *   1. every step is idempotent — each one filters on the *old* id, so replaying a
   *      completed step matches nothing rather than corrupting anything;
   *   2. every step has an inverse — reassigning new→old undoes it.
   *
   * The person row moves first, so the new id exists before anything points at it.
   *
   * Honest limitation: if a *compensation* also fails (a service dies mid-rollback),
   * the merge is left partially applied. We log that explicitly and loudly rather
   * than pretend otherwise. Making the recovery automatic needs the transactional
   * outbox in WO-2.1 — with it, these become durable retryable messages instead of
   * best-effort HTTP calls.
   */
  private async rehome(tenantId: string, oldId: string, newId: string) {
    const moved = await this.repo.rehomePersonOnly(tenantId, oldId, newId)
    if (moved === 0) {
      // Nothing to move — either already merged, or the row vanished underneath us.
      return this.repo.findById(tenantId, newId)
    }

    // Targets are recorded as *attempted*, before the call — not after it succeeds.
    // A timeout, a reset connection, or a 5xx raised after the remote UPDATE has
    // already committed all look like failures here while having actually applied.
    // Compensating only confirmed successes would leave those rows stranded on the
    // new id with the person row rolled back to the old one — and, since the
    // cross-schema FK was dropped, nothing in the database would catch it.
    // Compensation is idempotent, so replaying it against a target that never
    // applied is free.
    const attempted: ServiceTarget[] = []
    try {
      for (const target of this.rehomeTargets) {
        attempted.push(target)
        await this.reassignCustomer(target, tenantId, oldId, newId)
      }
    } catch (err) {
      this.logger.error(
        { tenantId, oldId, newId, err: String(err) },
        'Customer merge failed — rolling back',
      )
      await this.compensateRehome(tenantId, oldId, newId, attempted)
      // Generic message: the downstream body must not cross the API boundary.
      // 502 rather than 500 — this is an upstream-dependency failure, and the
      // distinction tells the caller it is worth retrying.
      throw new BadGatewayException('Customer merge failed and was rolled back')
    }

    return this.repo.findById(tenantId, newId)
  }

  /** Undo an attempted rehome, most recent step first. */
  private async compensateRehome(
    tenantId: string,
    oldId: string,
    newId: string,
    attempted: ServiceTarget[],
  ): Promise<void> {
    for (const target of [...attempted].reverse()) {
      try {
        await this.reassignCustomer(target, tenantId, newId, oldId)
      } catch (err) {
        this.logger.error(
          { tenantId, oldId, newId, service: target.name, err: String(err) },
          'INCONSISTENT STATE: failed to roll back customer merge — manual reconciliation required',
        )
      }
    }

    try {
      const restored = await this.repo.rehomePersonOnly(tenantId, newId, oldId)
      if (restored === 0) {
        this.logger.error(
          { tenantId, oldId, newId },
          'INCONSISTENT STATE: person id restore matched no rows — manual reconciliation required',
        )
      }
    } catch (err) {
      this.logger.error(
        { tenantId, oldId, newId, err: String(err) },
        'INCONSISTENT STATE: failed to restore person id after a failed merge — manual reconciliation required',
      )
    }
  }

  /** Ask one owning service to re-point its rows from one customer id to another. */
  private async reassignCustomer(
    target: ServiceTarget,
    tenantId: string,
    fromCustomerId: string,
    toCustomerId: string,
  ): Promise<void> {
    const headers: Record<string, string> = {
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    }
    // Always sent. The receiver is fail-closed outside tests, so omitting this
    // when unset would turn a clear configuration error into an opaque 401.
    if (this.internalSecret) headers['x-internal-secret'] = this.internalSecret

    // Bare fetch has no default timeout: a wedged downstream would hang the merge
    // indefinitely with the person row already moved, leaving an unbounded window
    // of inconsistency. Steps are idempotent, so bounding the wait is safe.
    const res = await fetch(`${target.url}/${target.path}/internal/reassign-customer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fromCustomerId, toCustomerId }),
      signal: AbortSignal.timeout(REASSIGN_TIMEOUT_MS),
    })

    if (!res.ok) {
      throw new Error(`${target.name} returned ${res.status} ${await res.text().catch(() => '')}`)
    }
  }

  async bulkImport(tenantId: string, rows: CreateCustomerDto[]) {
    const results = { created: 0, skipped: 0, errors: 0 }
    for (const row of rows) {
      try {
        if (row.email) {
          const existing = await this.repo.findByEmail(tenantId, row.email)
          if (existing) {
            results.skipped++
            continue
          }
        }
        await this.repo.create(tenantId, row)
        results.created++
      } catch {
        results.errors++
      }
    }
    return results
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.repo.findById(tenantId, id)
    if (!existing) throw new NotFoundException('Customer not found')
    await this.repo.update(tenantId, id, dto)
    return this.findById(tenantId, id)
  }

  async getFinancialProfile(tenantId: string, personId: string) {
    const customer = await this.repo.findById(tenantId, personId)
    if (!customer) throw new NotFoundException('Customer not found')

    const headers = { 'x-tenant-id': tenantId, 'Content-Type': 'application/json' }

    // Fetch booking stats for this customer (all statuses, no pagination needed for aggregation)
    let lifetimeSpend = 0
    let unpaidCount = 0
    let bookingCount = 0
    try {
      // Unversioned path: booking-service serves BookingsController at /bookings
      // (URI versioning is enabled with no defaultVersion and the controller
      // declares none). The previous /v1 path 404'd, and because the failure is
      // swallowed as non-fatal below, every financial profile silently reported
      // zero spend and zero bookings.
      const bRes = await fetch(
        `${this.bookingServiceUrl}/bookings?customerId=${personId}&limit=200`,
        { headers },
      )
      if (bRes.ok) {
        const bJson = (await bRes.json()) as {
          data?: { price?: number | null; paymentStatus?: string; status?: string }[]
        }
        const bookings = bJson.data ?? []
        bookingCount = bookings.filter((b) => b.status !== 'cancelled').length
        for (const b of bookings) {
          if (b.status === 'cancelled') continue
          if (b.price != null) lifetimeSpend += Number(b.price)
          if (b.paymentStatus === 'unpaid') unpaidCount++
        }
      }
    } catch {
      /* non-fatal */
    }

    // Fetch active membership (if any)
    let activeMembership: { planName: string; status: string; expiresAt?: string } | null = null
    try {
      // Unversioned for the same reason — membership-service enables no versioning.
      const mRes = await fetch(
        `${this.membershipServiceUrl}/memberships?customerId=${personId}&status=active&limit=1`,
        { headers },
      )
      if (mRes.ok) {
        const mJson = (await mRes.json()) as {
          data?: { planName?: string; status?: string; expiresAt?: string }[]
        }
        const first = mJson.data?.[0]
        if (first) {
          activeMembership = {
            planName: first.planName ?? 'Unknown plan',
            status: first.status ?? 'active',
            expiresAt: first.expiresAt,
          }
        }
      }
    } catch {
      /* non-fatal */
    }

    return {
      data: {
        personId,
        lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
        currency: 'GBP',
        bookingCount,
        unpaidBookings: unpaidCount,
        activeMembership,
      },
    }
  }
}
