import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, cleanCustomers, teardown, checkDbAvailable } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'
import { CustomersService } from '../src/customers/customers.service.js'

/**
 * Customer merge (rehome) — the saga that replaced a cross-schema write.
 *
 * This path used to be one local SQL transaction that UPDATEd booking.bookings and
 * membership.memberships directly, with `SET LOCAL session_replication_role = replica`
 * to switch off FK enforcement. That only worked because all three schemas share one
 * database today; it is impossible once they are split per-region, and it needed a
 * privilege the application role should never hold.
 *
 * It is now: update our own person row, then ask each owning service to re-point its
 * own rows, compensating in reverse if any step fails.
 *
 * `fetch` is stubbed so the saga's orchestration and rollback can be tested without
 * booking-service and membership-service running.
 */

const OLD_ID = '30000000-0000-4000-8000-0000000000c1'
const NEW_ID = '30000000-0000-4000-8000-0000000000c2'
const EMAIL = 'merge.target@example.test'

interface FetchCall {
  url: string
  tenant: string | undefined
  fromCustomerId: string
  toCustomerId: string
}

/** Record every reassign call the saga makes, optionally failing one service. */
function stubFetch(failFor?: string) {
  const calls: FetchCall[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input)
    const headers = (init?.headers ?? {}) as Record<string, string>
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      fromCustomerId: string
      toCustomerId: string
    }
    calls.push({ url, tenant: headers['x-tenant-id'], ...body })

    if (failFor && url.includes(failFor)) {
      return new Response('boom', { status: 500 })
    }
    return new Response(JSON.stringify({ data: { updated: 1 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch)
  return { calls, spy }
}

async function seedPerson(id: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO people.persons (id, tenant_id, first_name, email)
    VALUES (${id}::uuid, ${TEST_TENANT_ID}::uuid, 'Merge', ${EMAIL})
    ON CONFLICT (id) DO NOTHING
  `
}

async function personExists(id: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM people.persons WHERE id = ${id}::uuid
  `
  return (rows[0]?.n ?? 0) > 0
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Customer merge — cross-service saga', () => {
  let service: CustomersService

  beforeAll(async () => {
    const app = await getApp()
    service = app.get(CustomersService)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanCustomers()
  })

  afterAll(async () => {
    await teardown()
    await prisma.$disconnect()
    await closeApp()
  })

  it('moves the person and tells both owning services, rather than writing their tables', async () => {
    await seedPerson(OLD_ID)
    const { calls } = stubFetch()

    await service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })

    expect(await personExists(NEW_ID)).toBe(true)
    expect(await personExists(OLD_ID)).toBe(false)

    // One call per owning service, each carrying tenant context and the id pair.
    expect(calls).toHaveLength(2)
    expect(calls[0]!.url).toContain('/bookings/internal/reassign-customer')
    expect(calls[1]!.url).toContain('/memberships/internal/reassign-customer')
    for (const c of calls) {
      expect(c.tenant).toBe(TEST_TENANT_ID)
      expect(c.fromCustomerId).toBe(OLD_ID)
      expect(c.toCustomerId).toBe(NEW_ID)
    }
  })

  it('rolls back completely when a downstream service fails', async () => {
    await seedPerson(OLD_ID)
    // Booking succeeds, membership fails — the hard case: one step already applied.
    const { calls } = stubFetch('memberships')

    await expect(service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })).rejects.toThrow()

    // The person row is back where it started …
    expect(await personExists(OLD_ID)).toBe(true)
    expect(await personExists(NEW_ID)).toBe(false)

    // … and booking-service was explicitly told to undo its half.
    const undo = calls.find(
      (c) =>
        c.url.includes('bookings') && c.fromCustomerId === NEW_ID && c.toCustomerId === OLD_ID,
    )
    expect(undo).toBeDefined()
  })

  /**
   * The failure this design most needs to survive, and the one the first version
   * got wrong: a call that FAILS may still have APPLIED remotely — a read timeout,
   * a reset connection, or a 5xx raised after the UPDATE committed. If compensation
   * only replayed confirmed successes, those rows would stay on the new id while the
   * person row rolled back to the old one, and with the cross-schema FK dropped
   * nothing in the database would catch it.
   */
  it('compensates the service that FAILED, not just the ones that succeeded', async () => {
    await seedPerson(OLD_ID)
    const { calls } = stubFetch('bookings')

    await expect(service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })).rejects.toThrow()

    const undoOnFailedTarget = calls.find(
      (c) =>
        c.url.includes('bookings') && c.fromCustomerId === NEW_ID && c.toCustomerId === OLD_ID,
    )
    expect(undoOnFailedTarget).toBeDefined()
  })

  it('leaves nothing half-applied when the very first service fails', async () => {
    await seedPerson(OLD_ID)
    const { calls } = stubFetch('bookings')

    await expect(service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })).rejects.toThrow()

    expect(await personExists(OLD_ID)).toBe(true)
    expect(await personExists(NEW_ID)).toBe(false)
    // Membership must never have been asked to move forward — booking failed first.
    expect(
      calls.filter((c) => c.url.includes('memberships') && c.toCustomerId === NEW_ID),
    ).toHaveLength(0)
  })

  it('calls the unversioned paths the receiving services actually serve', async () => {
    await seedPerson(OLD_ID)
    const { calls } = stubFetch()

    await service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })

    // booking-service enables URI versioning with no defaultVersion and its
    // BookingsController declares none; membership-service enables no versioning
    // at all. A /v1 prefix here 404s — which is what the first version did.
    for (const c of calls) expect(c.url).not.toContain('/v1/')
    expect(calls[0]!.url).toMatch(/\/bookings\/internal\/reassign-customer$/)
    expect(calls[1]!.url).toMatch(/\/memberships\/internal\/reassign-customer$/)
  })

  /**
   * The case the old implementation could not do honestly.
   *
   * A person with activity history has child rows pointing at their id. Changing
   * the id used to violate those foreign keys, which is why the original code ran
   * the whole merge with `session_replication_role = replica` — disabling integrity
   * enforcement wholesale. Migration 20260729_person_fk_on_update_cascade makes the
   * children follow the parent instead, so the merge is legal on its own terms.
   */
  it('carries a person\'s child rows across the merge without disabling integrity checks', async () => {
    await seedPerson(OLD_ID)
    await prisma.$executeRaw`
      INSERT INTO people.person_activities (tenant_id, person_id, event_type, title, occurred_at)
      VALUES (${TEST_TENANT_ID}::uuid, ${OLD_ID}::uuid, 'booking.confirmed', 'Booked a court', now())
    `
    stubFetch()

    await service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })

    const rows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM people.person_activities WHERE person_id = ${NEW_ID}::uuid
    `
    expect(rows[0]!.n).toBe(1)
    expect(await personExists(NEW_ID)).toBe(true)
    expect(await personExists(OLD_ID)).toBe(false)
  })

  it('does not attempt a merge when the incoming id already matches the record', async () => {
    await seedPerson(NEW_ID)
    const { calls } = stubFetch()

    // findByEmail returns a row whose id === dto.id, so create() returns it
    // directly and rehome is never entered. (An earlier version of this test
    // claimed to cover the "already merged" branch inside rehome — it did not.)
    const res = await service.create(TEST_TENANT_ID, { id: NEW_ID, email: EMAIL })

    expect(res.data?.id).toBe(NEW_ID)
    expect(calls).toHaveLength(0)
  })
})
