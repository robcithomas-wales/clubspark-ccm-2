import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_NONEXISTENT_ID,
  TEST_BOOKING_ID,
  TEST_CUSTOMER_ID,
  FAKE_STRIPE_CREDENTIALS,
} from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

function paymentPayload(overrides: Record<string, unknown> = {}) {
  return {
    subjectType: 'booking',
    subjectId: TEST_BOOKING_ID,
    customerId: TEST_CUSTOMER_ID,
    amount: 2500,
    currency: 'GBP',
    idempotencyKey: `test:${TEST_BOOKING_ID}:${Date.now()}`,
    metadata: { bookingReference: 'BK-TEST01' },
    ...overrides,
  }
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Payments — integration', () => {
  let request: ReturnType<typeof supertest>
  let providerConfigId: string

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanAll()
  })

  afterAll(async () => {
    await cleanAll()
    await prisma.$disconnect()
    await closeApp()
  })

  async function setupProviderConfig() {
    const res = await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', currency: 'GBP', isDefault: true, credentials: FAKE_STRIPE_CREDENTIALS })
    providerConfigId = res.body.data.id
  }

  // ── GET /payments ─────────────────────────────────────────────────────────

  describe('GET /payments', () => {
    it('returns empty list when no payments exist', async () => {
      const res = await request.get('/payments').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('returns 401 without tenant header', async () => {
      const res = await request.get('/payments')
      expect(res.status).toBe(401)
    })
  })

  // ── POST /payments ────────────────────────────────────────────────────────

  describe('POST /payments', () => {
    it('returns 404 when no provider config is configured for the tenant', async () => {
      const res = await request
        .post('/payments')
        .set(JSON_HEADERS)
        .send(paymentPayload())

      expect(res.status).toBe(404)
    })

    it('returns 400 when required fields are missing', async () => {
      await setupProviderConfig()

      const res = await request
        .post('/payments')
        .set(JSON_HEADERS)
        .send({ amount: 2500 }) // missing subjectType, subjectId, idempotencyKey

      expect(res.status).toBe(400)
    })

    it('returns 400 when amount is zero', async () => {
      await setupProviderConfig()

      const res = await request
        .post('/payments')
        .set(JSON_HEADERS)
        .send(paymentPayload({ amount: 0 }))

      expect(res.status).toBe(400)
    })

    it('returns 400 when amount is negative', async () => {
      await setupProviderConfig()

      const res = await request
        .post('/payments')
        .set(JSON_HEADERS)
        .send(paymentPayload({ amount: -500 }))

      expect(res.status).toBe(400)
    })

    it('creates a payment record and attempts gateway call (fails with fake credentials)', async () => {
      await setupProviderConfig()

      const key = `test:idempotency:${Date.now()}`
      const res = await request
        .post('/payments')
        .set(JSON_HEADERS)
        .send(paymentPayload({ idempotencyKey: key }))

      // Gateway call will fail with fake Stripe key — service returns 500
      // but the payment record should have been created and marked failed in DB
      expect([201, 500]).toContain(res.status)

      if (res.status === 500) {
        // Verify payment was persisted and marked failed
        const payment = await prisma.payment.findFirst({
          where: { tenantId: TEST_TENANT_ID, idempotencyKey: key },
        })
        expect(payment).not.toBeNull()
        expect(payment!.status).toBe('failed')

        // Verify an attempt record was also written
        const attempt = await prisma.paymentAttempt.findFirst({
          where: { paymentId: payment!.id },
        })
        expect(attempt).not.toBeNull()
        expect(attempt!.status).toBe('failed')
      }
    })

    it('idempotency: duplicate key returns the existing payment without creating another', async () => {
      await setupProviderConfig()
      const key = `idempotent-key-${Date.now()}`

      // First request
      await request.post('/payments').set(JSON_HEADERS).send(paymentPayload({ idempotencyKey: key }))

      // Second request with the same key
      await request.post('/payments').set(JSON_HEADERS).send(paymentPayload({ idempotencyKey: key }))

      // Only one payment record should exist for this key
      const count = await prisma.payment.count({
        where: { tenantId: TEST_TENANT_ID, idempotencyKey: key },
      })
      expect(count).toBe(1)
    })
  })

  // ── GET /payments/:id ─────────────────────────────────────────────────────

  describe('GET /payments/:id', () => {
    it('returns 404 for a non-existent payment', async () => {
      const res = await request.get(`/payments/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })

    it('returns the payment when it exists', async () => {
      await setupProviderConfig()

      // Create a payment record directly in the DB (bypassing gateway)
      const payment = await prisma.payment.create({
        data: {
          tenantId: TEST_TENANT_ID,
          idempotencyKey: `direct:${Date.now()}`,
          subjectType: 'booking',
          subjectId: TEST_BOOKING_ID,
          customerId: TEST_CUSTOMER_ID,
          providerConfigId,
          amount: 2500,
          currency: 'GBP',
          status: 'succeeded',
          gatewayRef: 'pi_test_123',
        },
      })

      const res = await request.get(`/payments/${payment.id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(payment.id)
      expect(res.body.data.amount).toBe(2500)
      expect(res.body.data.status).toBe('succeeded')
    })

    it('returns 404 when fetching a payment belonging to another tenant', async () => {
      await setupProviderConfig()

      const payment = await prisma.payment.create({
        data: {
          tenantId: TEST_TENANT_ID,
          idempotencyKey: `cross-tenant:${Date.now()}`,
          subjectType: 'booking',
          subjectId: TEST_BOOKING_ID,
          providerConfigId,
          amount: 1000,
          currency: 'GBP',
          status: 'succeeded',
        },
      })

      // Request with a different tenant ID
      const res = await request
        .get(`/payments/${payment.id}`)
        .set({ 'x-tenant-id': 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' })

      expect(res.status).toBe(404)
    })
  })

  // ── GET /payments?subjectId= ──────────────────────────────────────────────

  describe('GET /payments filtering', () => {
    it('filters payments by subjectType and subjectId', async () => {
      await setupProviderConfig()

      const otherId = '60000000-0000-4000-8000-000000000099'

      await prisma.payment.createMany({
        data: [
          {
            tenantId: TEST_TENANT_ID,
            idempotencyKey: `filter:1:${Date.now()}`,
            subjectType: 'booking',
            subjectId: TEST_BOOKING_ID,
            providerConfigId,
            amount: 1000,
            currency: 'GBP',
            status: 'succeeded',
          },
          {
            tenantId: TEST_TENANT_ID,
            idempotencyKey: `filter:2:${Date.now()}`,
            subjectType: 'membership',
            subjectId: otherId,
            providerConfigId,
            amount: 5000,
            currency: 'GBP',
            status: 'succeeded',
          },
        ],
      })

      const res = await request
        .get(`/payments?subjectType=booking&subjectId=${TEST_BOOKING_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].subjectType).toBe('booking')
    })
  })

  // ── POST /payments/:id/refund ─────────────────────────────────────────────

  describe('POST /payments/:id/refund', () => {
    it('returns 404 for a non-existent payment', async () => {
      const res = await request
        .post(`/payments/${TEST_NONEXISTENT_ID}/refund`)
        .set(JSON_HEADERS)
        .send({})
      expect(res.status).toBe(404)
    })

    it('returns 409 when attempting to refund a pending payment', async () => {
      await setupProviderConfig()

      const payment = await prisma.payment.create({
        data: {
          tenantId: TEST_TENANT_ID,
          idempotencyKey: `refund-pending:${Date.now()}`,
          subjectType: 'booking',
          subjectId: TEST_BOOKING_ID,
          providerConfigId,
          amount: 2500,
          currency: 'GBP',
          status: 'pending',
        },
      })

      const res = await request
        .post(`/payments/${payment.id}/refund`)
        .set(JSON_HEADERS)
        .send({ reason: 'Test refund' })

      expect(res.status).toBe(409)
    })

    it('returns 409 when attempting to refund a failed payment', async () => {
      await setupProviderConfig()

      const payment = await prisma.payment.create({
        data: {
          tenantId: TEST_TENANT_ID,
          idempotencyKey: `refund-failed:${Date.now()}`,
          subjectType: 'booking',
          subjectId: TEST_BOOKING_ID,
          providerConfigId,
          amount: 2500,
          currency: 'GBP',
          status: 'failed',
        },
      })

      const res = await request
        .post(`/payments/${payment.id}/refund`)
        .set(JSON_HEADERS)
        .send({})

      expect(res.status).toBe(409)
    })

    it('initiates a refund for a succeeded payment (gateway call will fail with fake key)', async () => {
      await setupProviderConfig()

      const payment = await prisma.payment.create({
        data: {
          tenantId: TEST_TENANT_ID,
          idempotencyKey: `refund-succeeded:${Date.now()}`,
          subjectType: 'booking',
          subjectId: TEST_BOOKING_ID,
          providerConfigId,
          amount: 2500,
          currency: 'GBP',
          status: 'succeeded',
          gatewayRef: 'pi_test_abc',
        },
      })

      const res = await request
        .post(`/payments/${payment.id}/refund`)
        .set(JSON_HEADERS)
        .send({ amount: 1000, reason: 'Partial refund' })

      // Gateway call will fail with fake credentials — either 500 (Stripe error)
      // or 200 if Stripe test mode tolerates the call.
      // Either way, a refund record should have been created.
      const refund = await prisma.refund.findFirst({ where: { paymentId: payment.id } })
      expect(refund).not.toBeNull()
      expect(refund!.amount).toBe(1000)
      expect(refund!.reason).toBe('Partial refund')
    })
  })

  // ── Health ────────────────────────────────────────────────────────────────

  describe('Health', () => {
    it('GET /health returns ok', async () => {
      const res = await request.get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('payment-service')
    })

    it('GET /health/db returns ok when database is reachable', async () => {
      const res = await request.get('/health/db')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })
})
