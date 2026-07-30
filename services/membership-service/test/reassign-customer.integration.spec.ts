import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, cleanMemberships, teardownFixtures, checkDbAvailable } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_PLAN_ID,
  TEST_CUSTOMER_ID,
} from './fixtures/index.js'

/**
 * The internal customer-reassignment hook.
 *
 * Exists so people-service can stop writing to membership.memberships directly —
 * that cross-schema write blocked the regional split. See
 * docs/architecture/cross-schema-coupling-inventory.md (row PS1).
 *
 * The caller's saga depends on this being idempotent, reversible, and
 * tenant-scoped; those are what these tests pin down.
 */

const NEW_CUSTOMER = '20000000-0000-4000-8000-0000000000a2'
const OTHER_TENANT = '20000000-0000-4000-8000-0000000000b0'
const OTHER_ORG = '20000000-0000-4000-8000-0000000000b1'

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

// The harness builds the app without enableVersioning(), matching the other specs.
const ENDPOINT = '/memberships/internal/reassign-customer'

async function insertMembership(customerId: string, tenantId = TEST_TENANT_ID): Promise<string> {
  const m = await prisma.membership.create({
    data: {
      tenantId,
      organisationId: TEST_ORG_ID,
      planId: TEST_PLAN_ID,
      customerId,
      ownerType: 'person',
      ownerId: customerId,
      status: 'active',
      startDate: new Date('2099-01-01'),
    },
    select: { id: true },
  })
  return m.id
}

async function customerOf(id: string): Promise<string | null> {
  const m = await prisma.membership.findUnique({ where: { id }, select: { customerId: true } })
  return m?.customerId ?? null
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Memberships — internal customer reassignment', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanMemberships()
    await prisma.membership.deleteMany({ where: { tenantId: OTHER_TENANT } })
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  /**
   * NEW_CUSTOMER deliberately has no row in people.persons. Before
   * 20260729_drop_cross_schema_customer_fk this failed with a foreign-key
   * violation, because membership.memberships had a DB-level FK into another
   * service's schema. Membership must not depend on people's tables existing —
   * that is precisely the coupling the regional split cannot tolerate. If this
   * test starts failing, someone has re-added a cross-schema foreign key.
   */
  it('accepts a customer id that has no row in people.persons', async () => {
    const a = await insertMembership(TEST_CUSTOMER_ID)

    const res = await request
      .post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })

    expect(res.status).toBe(200)
    expect(await customerOf(a)).toBe(NEW_CUSTOMER)
  })

  it('rejects a request with no tenant header', async () => {
    const res = await request
      .post(ENDPOINT)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })
    // @SkipTenant() route — the handler rejects the missing header itself.
    expect(res.status).toBe(400)
  })

  it('rejects a body missing the ids', async () => {
    const res = await request.post(ENDPOINT).set(HEADERS).send({ fromCustomerId: '' })
    // Guards against the global ValidationPipe going missing from main.ts again —
    // without it these DTO decorators are inert in production.
    expect(res.status).toBe(400)
  })

  it('moves memberships across every organisation in the tenant', async () => {
    // Deliberate: a person is tenant-level, so a merge must not leave memberships
    // stranded in another organisation pointing at a dead customer id.
    const inOrgA = await insertMembership(TEST_CUSTOMER_ID)
    const inOrgB = await prisma.membership.create({
      data: {
        tenantId: TEST_TENANT_ID,
        organisationId: OTHER_ORG,
        planId: TEST_PLAN_ID,
        customerId: TEST_CUSTOMER_ID,
        ownerType: 'person',
        ownerId: TEST_CUSTOMER_ID,
        status: 'active',
        startDate: new Date('2099-01-01'),
      },
      select: { id: true },
    })

    const res = await request
      .post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })

    expect(res.body.data.updated).toBe(2)
    expect(await customerOf(inOrgA)).toBe(NEW_CUSTOMER)
    expect(await customerOf(inOrgB.id)).toBe(NEW_CUSTOMER)
  })

  it('re-points every membership for the customer and reports the count', async () => {
    const a = await insertMembership(TEST_CUSTOMER_ID)

    const res = await request
      .post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })

    expect(res.status).toBe(200)
    expect(res.body.data.updated).toBe(1)
    expect(await customerOf(a)).toBe(NEW_CUSTOMER)
  })

  it('is idempotent — a repeat call is a no-op, not an error', async () => {
    await insertMembership(TEST_CUSTOMER_ID)

    const first = await request.post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })
    const second = await request.post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })

    expect(first.body.data.updated).toBe(1)
    expect(second.status).toBe(200)
    expect(second.body.data.updated).toBe(0)
  })

  it('is reversible — reassigning back restores the original id', async () => {
    const a = await insertMembership(TEST_CUSTOMER_ID)

    await request.post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })
    // Exactly what the caller's compensation step does on failure.
    await request.post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: NEW_CUSTOMER, toCustomerId: TEST_CUSTOMER_ID })

    expect(await customerOf(a)).toBe(TEST_CUSTOMER_ID)
  })

  it('never touches another tenant\'s memberships', async () => {
    const mine = await insertMembership(TEST_CUSTOMER_ID)
    const theirs = await insertMembership(TEST_CUSTOMER_ID, OTHER_TENANT)

    const res = await request.post(ENDPOINT).set(HEADERS)
      .send({ fromCustomerId: TEST_CUSTOMER_ID, toCustomerId: NEW_CUSTOMER })

    expect(res.body.data.updated).toBe(1)
    expect(await customerOf(mine)).toBe(NEW_CUSTOMER)
    expect(await customerOf(theirs)).toBe(TEST_CUSTOMER_ID)
  })
})
