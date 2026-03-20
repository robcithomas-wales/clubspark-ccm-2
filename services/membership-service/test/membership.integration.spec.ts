import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, cleanMemberships, teardownFixtures, checkDbAvailable } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_SCHEME_ID,
  TEST_PLAN_ID,
  TEST_NONEXISTENT_ID,
  TEST_CUSTOMER_ID,
} from './fixtures/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

const PLAN_BODY = {
  ownershipType: 'person',
  durationType: 'fixed',
  visibility: 'public',
  sortOrder: 0,
}

// ─── Suite ──────────────────────────────────────────────────────────────────

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Membership service — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Membership Schemes
  // ══════════════════════════════════════════════════════════════════════════

  describe('Membership Schemes', () => {
    it('creates a scheme and returns 201 with an id', async () => {
      const res = await request
        .post('/membership-schemes')
        .set(JSON_HEADERS)
        .send({ name: 'Adult Membership' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Adult Membership')
      expect(res.body.data.status).toBe('active')
    })

    it('lists schemes for the tenant', async () => {
      const res = await request.get('/membership-schemes').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('gets a scheme by id', async () => {
      const res = await request
        .get(`/membership-schemes/${TEST_SCHEME_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(TEST_SCHEME_ID)
      expect(res.body.data.name).toBe('Test Scheme')
    })

    it('returns 404 for a non-existent scheme', async () => {
      const res = await request
        .get(`/membership-schemes/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a scheme name', async () => {
      const created = await request
        .post('/membership-schemes')
        .set(JSON_HEADERS)
        .send({ name: 'To Be Updated' })

      const res = await request
        .patch(`/membership-schemes/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Updated Name' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Updated Name')
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/membership-schemes')
        .set(JSON_HEADERS)
        .send({ description: 'No name provided' })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request
        .get('/membership-schemes')

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Membership Plans
  // ══════════════════════════════════════════════════════════════════════════

  describe('Membership Plans', () => {
    it('creates a plan linked to a scheme and returns 201', async () => {
      const res = await request
        .post('/membership-plans')
        .set(JSON_HEADERS)
        .send({ schemeId: TEST_SCHEME_ID, name: 'Monthly Plan', ...PLAN_BODY })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.schemeId).toBe(TEST_SCHEME_ID)
      expect(res.body.data.name).toBe('Monthly Plan')
    })

    it('lists plans for the tenant', async () => {
      const res = await request.get('/membership-plans').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters plans by schemeId', async () => {
      const res = await request
        .get(`/membership-plans?schemeId=${TEST_SCHEME_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((p: any) => p.schemeId === TEST_SCHEME_ID)).toBe(true)
    })

    it('gets a plan by id', async () => {
      const res = await request
        .get(`/membership-plans/${TEST_PLAN_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(TEST_PLAN_ID)
      expect(res.body.data.name).toBe('Test Plan')
    })

    it('returns 404 for a non-existent plan', async () => {
      const res = await request
        .get(`/membership-plans/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/membership-plans')
        .set(JSON_HEADERS)
        .send({ schemeId: TEST_SCHEME_ID, ...PLAN_BODY })

      expect(res.status).toBe(400)
    })

    it('returns 400 when schemeId is missing', async () => {
      const res = await request
        .post('/membership-plans')
        .set(JSON_HEADERS)
        .send({ name: 'No Scheme', ...PLAN_BODY })

      expect(res.status).toBe(400)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Memberships
  // ══════════════════════════════════════════════════════════════════════════

  describe('Memberships', () => {
    afterEach(async () => {
      await cleanMemberships()
    })

    it('creates a membership and returns 201 with an id', async () => {
      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.planId).toBe(TEST_PLAN_ID)
      expect(res.body.data.status).toBe('pending')
    })

    it('creates a membership with a customerId', async () => {
      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({
          planId: TEST_PLAN_ID,
          customerId: TEST_CUSTOMER_ID,
          startDate: '2026-01-01',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.customerId).toBe(TEST_CUSTOMER_ID)
    })

    it('lists memberships for the tenant', async () => {
      await request.post('/memberships').set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })
      await request.post('/memberships').set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-02-01' })

      const res = await request.get('/memberships').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('filters memberships by planId', async () => {
      await request.post('/memberships').set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      const res = await request
        .get(`/memberships?planId=${TEST_PLAN_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((m: any) => m.planId === TEST_PLAN_ID)).toBe(true)
    })

    it('gets a membership by id', async () => {
      const created = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      const res = await request
        .get(`/memberships/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
    })

    it('returns 404 for a non-existent membership', async () => {
      const res = await request
        .get(`/memberships/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a membership status', async () => {
      const created = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      const res = await request
        .patch(`/memberships/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ status: 'paused' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('paused')
    })

    it('deletes a membership and returns 204', async () => {
      const created = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      const res = await request
        .delete(`/memberships/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(204)
    })

    it('returns 404 when deleting a non-existent membership', async () => {
      const res = await request
        .delete(`/memberships/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('returns 400 when planId is missing', async () => {
      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when startDate is missing', async () => {
      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID })

      expect(res.status).toBe(400)
    })

    it('returns empty list when tenant has no memberships', async () => {
      const res = await request.get('/memberships').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })
})
