/**
 * Extended membership-service integration tests covering:
 *  - Entitlement policies (CRUD including the PATCH endpoint)
 *  - Plan entitlements (replace / list)
 *  - Memberships: renewals-due, bulk-transition, record-payment
 *  - Auto end-date calculation from plan durationType / billingInterval
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, cleanMemberships, teardownFixtures } from './helpers/db.js'
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

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('Membership service — advanced integration', () => {
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

  afterEach(async () => {
    await cleanMemberships()
    // Clean up any entitlement policies created during tests
    await prisma.entitlementPolicy.deleteMany({
      where: { tenantId: TEST_TENANT_ID, name: { startsWith: 'Test Policy' } },
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Entitlement Policies
  // ══════════════════════════════════════════════════════════════════════════

  describe('Entitlement Policies', () => {
    it('creates a policy and returns 201 with an id', async () => {
      const res = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Alpha', policyType: 'booking_access' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Test Policy Alpha')
      expect(res.body.data.policyType).toBe('booking_access')
      expect(res.body.data.status).toBe('active')
    })

    it('lists entitlement policies for the org', async () => {
      await request.post('/entitlement-policies').set(JSON_HEADERS)
        .send({ name: 'Test Policy Beta' })

      const res = await request.get('/entitlement-policies').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('gets a policy by id', async () => {
      const created = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Gamma' })

      const res = await request
        .get(`/entitlement-policies/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
      expect(res.body.data.name).toBe('Test Policy Gamma')
    })

    it('returns 404 for a non-existent policy', async () => {
      const res = await request
        .get(`/entitlement-policies/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a policy name via PATCH', async () => {
      const created = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Delta' })

      const res = await request
        .patch(`/entitlement-policies/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Delta Updated' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Test Policy Delta Updated')
    })

    it('updates policyType and description via PATCH', async () => {
      const created = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Epsilon', policyType: 'booking_access' })

      const res = await request
        .patch(`/entitlement-policies/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ policyType: 'booking_window', description: 'Updated desc' })

      expect(res.status).toBe(200)
      expect(res.body.data.policyType).toBe('booking_window')
      expect(res.body.data.description).toBe('Updated desc')
    })

    it('returns 404 when patching a non-existent policy', async () => {
      const res = await request
        .patch(`/entitlement-policies/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })

    it('returns 400 when name is missing on create', async () => {
      const res = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ policyType: 'booking_access' })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/entitlement-policies')

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Plan Entitlements (replace / list)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Plan Entitlements', () => {
    it('returns empty list when plan has no entitlements', async () => {
      const res = await request
        .get(`/membership-plans/${TEST_PLAN_ID}/entitlements`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toHaveLength(0)
    })

    it('replaces plan entitlements with a new policy', async () => {
      // Create a policy to link
      const policy = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy Plan Link' })

      const res = await request
        .put(`/membership-plans/${TEST_PLAN_ID}/entitlements`)
        .set(JSON_HEADERS)
        .send({
          entitlements: [
            { entitlementPolicyId: policy.body.data.id, priority: 100 },
          ],
        })

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].entitlementPolicyId).toBe(policy.body.data.id)
    })

    it('replaces plan entitlements with empty array clears all', async () => {
      const policy = await request
        .post('/entitlement-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Test Policy To Clear' })

      // First set an entitlement
      await request
        .put(`/membership-plans/${TEST_PLAN_ID}/entitlements`)
        .set(JSON_HEADERS)
        .send({ entitlements: [{ entitlementPolicyId: policy.body.data.id }] })

      // Then clear it
      const res = await request
        .put(`/membership-plans/${TEST_PLAN_ID}/entitlements`)
        .set(JSON_HEADERS)
        .send({ entitlements: [] })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Memberships — record-payment
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /memberships/:id/record-payment', () => {
    it('records a payment and updates paymentStatus', async () => {
      const created = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      const res = await request
        .post(`/memberships/${created.body.data.id}/record-payment`)
        .set(JSON_HEADERS)
        .send({ paymentStatus: 'paid', paymentMethod: 'card', paymentReference: 'REF123' })

      expect(res.status).toBe(201)
      expect(res.body.data.paymentStatus).toBe('paid')
    })

    it('returns 404 when the membership does not exist', async () => {
      const res = await request
        .post(`/memberships/${TEST_NONEXISTENT_ID}/record-payment`)
        .set(JSON_HEADERS)
        .send({ paymentStatus: 'paid' })

      expect(res.status).toBe(404)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Memberships — bulk-transition
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /memberships/bulk-transition', () => {
    it('activates multiple memberships in one call', async () => {
      const [m1, m2] = await Promise.all([
        request.post('/memberships').set(JSON_HEADERS)
          .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' }),
        request.post('/memberships').set(JSON_HEADERS)
          .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-02-01' }),
      ])

      const res = await request
        .post('/memberships/bulk-transition')
        .set(JSON_HEADERS)
        .send({ ids: [m1.body.data.id, m2.body.data.id], action: 'activate' })

      expect(res.status).toBe(201)
      expect(res.body.data.updated).toBe(2)
    })

    it('returns 400 when ids array is empty', async () => {
      const res = await request
        .post('/memberships/bulk-transition')
        .set(JSON_HEADERS)
        .send({ ids: [], action: 'activate' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when action is missing', async () => {
      const res = await request
        .post('/memberships/bulk-transition')
        .set(JSON_HEADERS)
        .send({ ids: [TEST_PLAN_ID] })

      expect(res.status).toBe(400)
    })

    it('ignores non-existent ids and returns updated count', async () => {
      const res = await request
        .post('/memberships/bulk-transition')
        .set(JSON_HEADERS)
        .send({ ids: [TEST_NONEXISTENT_ID], action: 'activate' })

      expect(res.status).toBe(201)
      expect(res.body.data.updated).toBe(0)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Memberships — renewals-due
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /memberships/renewals-due', () => {
    it('returns an empty list when no memberships are expiring soon', async () => {
      // Create a membership with far-future end date
      await request.post('/memberships').set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01', endDate: '2099-12-31' })

      const res = await request
        .get('/memberships/renewals-due?days=7')
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toHaveLength(0)
    })

    it('returns memberships expiring within the window', async () => {
      // Create membership expiring in 2 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 2)
      const endDate = expiresAt.toISOString().slice(0, 10)

      await request.post('/memberships').set(JSON_HEADERS)
        .send({ planId: TEST_PLAN_ID, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01', endDate, status: 'active' })

      const res = await request
        .get('/memberships/renewals-due?days=7')
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('defaults to 30-day window when days param is omitted', async () => {
      const res = await request
        .get('/memberships/renewals-due')
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Memberships — auto end-date from plan durationType
  // ══════════════════════════════════════════════════════════════════════════

  describe('Auto end-date calculation', () => {
    it('calculates endDate for a monthly plan when not supplied', async () => {
      // Create a plan with durationType=recurring, billingInterval=monthly
      const plan = await request
        .post('/membership-plans')
        .set(JSON_HEADERS)
        .send({
          schemeId: TEST_SCHEME_ID,
          name: 'Monthly Auto Plan',
          ownershipType: 'person',
          durationType: 'recurring',
          billingInterval: 'monthly',
          visibility: 'public',
          sortOrder: 0,
        })

      expect(plan.status).toBe(201)

      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: plan.body.data.id, customerId: TEST_CUSTOMER_ID, startDate: '2026-06-01' })

      expect(res.status).toBe(201)
      // endDate should be ~1 month after start (2026-07-01)
      expect(res.body.data.endDate).toBeTruthy()
      const endDate = new Date(res.body.data.endDate)
      const startDate = new Date('2026-06-01')
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
      // Monthly = 28–31 days
      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
    })

    it('calculates endDate for an annual plan when not supplied', async () => {
      const plan = await request
        .post('/membership-plans')
        .set(JSON_HEADERS)
        .send({
          schemeId: TEST_SCHEME_ID,
          name: 'Annual Auto Plan',
          ownershipType: 'person',
          durationType: 'recurring',
          billingInterval: 'annual',
          visibility: 'public',
          sortOrder: 0,
        })

      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({ planId: plan.body.data.id, customerId: TEST_CUSTOMER_ID, startDate: '2026-01-01' })

      expect(res.status).toBe(201)
      expect(res.body.data.endDate).toBeTruthy()
      const endDate = new Date(res.body.data.endDate)
      const startDate = new Date('2026-01-01')
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
      // Annual = 365–366 days
      expect(diffDays).toBeGreaterThanOrEqual(365)
      expect(diffDays).toBeLessThanOrEqual(366)
    })

    it('preserves a manually supplied endDate', async () => {
      const res = await request
        .post('/memberships')
        .set(JSON_HEADERS)
        .send({
          planId: TEST_PLAN_ID,
          customerId: TEST_CUSTOMER_ID,
          startDate: '2026-01-01',
          endDate: '2027-06-30',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.endDate).toContain('2027-06-30')
    })
  })
})
