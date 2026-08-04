import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import type { ExecutionContext } from '@nestjs/common'
import { InternalSecretGuard } from '@clubspark/auth'
import { getApp, closeApp } from './helpers/app.js'
import {
  prisma,
  seedFixtures,
  cleanBookings,
  teardownFixtures,
  checkDbAvailable,
} from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
} from './fixtures/index.js'

/**
 * The internal customer-reassignment hook.
 *
 * This endpoint exists so people-service can stop writing to booking.bookings
 * directly. That cross-schema write blocked the regional split — see
 * docs/architecture/cross-schema-coupling-inventory.md (row PS1).
 *
 * The properties that matter to the caller's saga are idempotency (safe to retry)
 * and tenant isolation (a merge in one tenant must never touch another's rows).
 */

const OLD_CUSTOMER = '10000000-0000-4000-8000-0000000000a1'
const NEW_CUSTOMER = '10000000-0000-4000-8000-0000000000a2'
const OTHER_TENANT = '10000000-0000-4000-8000-0000000000b0'

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

// The test harness builds the app without enableVersioning(), so routes are
// unprefixed here — matching every other spec in this suite. In production the
// URI versioning in main.ts serves this at /v1/bookings/internal/reassign-customer.
const ENDPOINT = '/bookings/internal/reassign-customer'

/**
 * booking.bookings carries an exclusion constraint forbidding two active bookings
 * on the same unit and overlapping window, so each fixture booking gets its own
 * hour slot via `slot`.
 */
let slotCounter = 0
async function insertBooking(customerId: string, tenantId = TEST_TENANT_ID): Promise<string> {
  const slot = slotCounter++
  const startsAt = new Date(Date.UTC(2099, 6, 1, 6 + slot, 0, 0)).toISOString()
  const endsAt = new Date(Date.UTC(2099, 6, 1, 7 + slot, 0, 0)).toISOString()
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO booking.bookings (
      tenant_id, organisation_id, venue_id, resource_id, bookable_unit_id,
      customer_id, starts_at, ends_at, status, booking_reference
    )
    VALUES (
      ${tenantId}::uuid, ${TEST_ORG_ID}::uuid, ${TEST_VENUE_ID}::uuid,
      ${TEST_RESOURCE_ID}::uuid, ${TEST_UNIT_ID}::uuid, ${customerId}::uuid,
      ${startsAt}::timestamptz, ${endsAt}::timestamptz,
      'active', ${'RA-' + slot}
    )
    RETURNING id::text AS id
  `
  return rows[0]!.id
}

async function customerOf(bookingId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ customerId: string | null }[]>`
    SELECT customer_id::text AS "customerId" FROM booking.bookings WHERE id = ${bookingId}::uuid
  `
  return rows[0]?.customerId ?? null
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Bookings — internal customer reassignment', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanBookings()
    await prisma.$executeRaw`DELETE FROM booking.bookings WHERE tenant_id = ${OTHER_TENANT}::uuid`
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  it('rejects a request with no tenant header', async () => {
    const res = await request
      .post(ENDPOINT)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })
    // The route is @SkipTenant(), so the tenant guard no longer 401s it — the
    // handler rejects the missing header itself.
    expect(res.status).toBe(400)
  })

  /**
   * The suites run with NODE_ENV=test, where InternalSecretGuard intentionally
   * allows through so the fixtures don't all need a secret. That means the
   * enforcement branch would otherwise have zero coverage — which is exactly how
   * a permissive guard ships unnoticed. These drive the guard directly.
   */
  describe('InternalSecretGuard enforcement', () => {
    const guard = new InternalSecretGuard()
    const ctx = (headers: Record<string, string>) =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ headers }) }),
      }) as unknown as ExecutionContext

    const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
      const prev = { ...process.env }
      // Assigning undefined to process.env coerces to the STRING "undefined",
      // which is truthy — the key has to be deleted to genuinely unset it.
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
      try {
        fn()
      } finally {
        process.env = prev
      }
    }

    it('rejects when INTERNAL_SECRET is unset outside test', () => {
      withEnv({ NODE_ENV: 'production', INTERNAL_SECRET: undefined }, () => {
        expect(() => guard.canActivate(ctx({}))).toThrow(/not configured/i)
      })
    })

    it('does NOT open up in development — that is where the platform actually runs', () => {
      withEnv({ NODE_ENV: 'development', INTERNAL_SECRET: undefined }, () => {
        expect(() => guard.canActivate(ctx({}))).toThrow(/not configured/i)
      })
    })

    it('rejects a missing or wrong secret when one is configured', () => {
      withEnv({ NODE_ENV: 'production', INTERNAL_SECRET: 'right' }, () => {
        expect(() => guard.canActivate(ctx({}))).toThrow(/Invalid or missing/i)
        expect(() => guard.canActivate(ctx({ 'x-internal-secret': 'wrong' }))).toThrow(
          /Invalid or missing/i,
        )
      })
    })

    it('accepts the correct secret', () => {
      withEnv({ NODE_ENV: 'production', INTERNAL_SECRET: 'right' }, () => {
        expect(guard.canActivate(ctx({ 'x-internal-secret': 'right' }))).toBe(true)
      })
    })
  })

  it('rejects a body missing the ids', async () => {
    const res = await request.post(ENDPOINT).set(HEADERS).send({ fromCustomerId: '' })
    expect(res.status).toBe(400)
  })

  it('re-points every booking for the customer and reports the count', async () => {
    const a = await insertBooking(OLD_CUSTOMER)
    const b = await insertBooking(OLD_CUSTOMER)

    const res = await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })

    expect(res.status).toBe(200)
    expect(res.body.data.updated).toBe(2)
    expect(await customerOf(a)).toBe(NEW_CUSTOMER)
    expect(await customerOf(b)).toBe(NEW_CUSTOMER)
  })

  it('is idempotent — a repeat call is a no-op, not an error', async () => {
    const a = await insertBooking(OLD_CUSTOMER)

    const first = await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })
    const second = await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })

    expect(first.body.data.updated).toBe(1)
    expect(second.status).toBe(200)
    expect(second.body.data.updated).toBe(0)
    expect(await customerOf(a)).toBe(NEW_CUSTOMER)
  })

  it('is reversible — reassigning back restores the original id', async () => {
    const a = await insertBooking(OLD_CUSTOMER)

    await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })
    // This is exactly what the caller's compensation step does on failure.
    await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: NEW_CUSTOMER, toCustomerId: OLD_CUSTOMER })

    expect(await customerOf(a)).toBe(OLD_CUSTOMER)
  })

  it("never touches another tenant's bookings", async () => {
    const mine = await insertBooking(OLD_CUSTOMER)
    const theirs = await insertBooking(OLD_CUSTOMER, OTHER_TENANT)

    const res = await request
      .post(ENDPOINT)
      .set(HEADERS)
      .send({ fromCustomerId: OLD_CUSTOMER, toCustomerId: NEW_CUSTOMER })

    expect(res.body.data.updated).toBe(1)
    expect(await customerOf(mine)).toBe(NEW_CUSTOMER)
    expect(await customerOf(theirs)).toBe(OLD_CUSTOMER)
  })
})
