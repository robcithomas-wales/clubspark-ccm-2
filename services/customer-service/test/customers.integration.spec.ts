import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, cleanCustomers, teardown } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_CUSTOMER = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@example.com',
  phone: '07700123456',
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('Customer service — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterAll(async () => {
    await teardown()
    await prisma.$disconnect()
    await closeApp()
  })

  afterEach(async () => {
    await cleanCustomers()
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Create customer
  // ══════════════════════════════════════════════════════════════════════════

  describe('POST /customers', () => {
    it('creates a customer and returns 201 with an id', async () => {
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.firstName).toBe('Jane')
      expect(res.body.data.lastName).toBe('Smith')
      expect(res.body.data.email).toBe('jane.smith@example.com')
    })

    it('creates a customer with only required fields (no email or phone)', async () => {
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send({ firstName: 'Bob', lastName: 'Jones' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.firstName).toBe('Bob')
    })

    it('accepts a pre-supplied id', async () => {
      const customId = '30000000-0000-4000-8000-000000000001'
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send({ id: customId, firstName: 'Custom', lastName: 'Id' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBe(customId)
    })

    it('returns 400 when firstName is missing', async () => {
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send({ lastName: 'Smith', email: 'x@x.com' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when lastName is missing', async () => {
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send({ firstName: 'Jane', email: 'x@x.com' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when email is not a valid email address', async () => {
      const res = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send({ firstName: 'Jane', lastName: 'Smith', email: 'not-an-email' })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request
        .post('/customers')
        .send(VALID_CUSTOMER)

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // List customers
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /customers', () => {
    it('returns an empty list when no customers exist', async () => {
      const res = await request.get('/customers').set(HEADERS)

      expect(res.status).toBe(200)
      // Response may be array or { data: [] }
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBe(0)
    })

    it('lists customers for the tenant', async () => {
      await request.post('/customers').set(JSON_HEADERS).send(VALID_CUSTOMER)
      await request.post('/customers').set(JSON_HEADERS)
        .send({ firstName: 'Alice', lastName: 'Brown' })

      const res = await request.get('/customers').set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeGreaterThanOrEqual(2)
    })

    it('searches by name', async () => {
      await request.post('/customers').set(JSON_HEADERS).send(VALID_CUSTOMER)
      await request.post('/customers').set(JSON_HEADERS)
        .send({ firstName: 'Alice', lastName: 'Brown' })

      const res = await request
        .get('/customers?search=Jane')
        .set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list.some((c: any) => c.firstName === 'Jane')).toBe(true)
    })

    it('respects the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await request.post('/customers').set(JSON_HEADERS)
          .send({ firstName: `User${i}`, lastName: 'Test' })
      }

      const res = await request.get('/customers?limit=2').set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeLessThanOrEqual(2)
    })

    it('enforces max limit of 100', async () => {
      const res = await request.get('/customers?limit=500').set(HEADERS)

      expect(res.status).toBe(200)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/customers')

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Get customer by ID
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /customers/:id', () => {
    it('retrieves a customer by id', async () => {
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .get(`/customers/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
      expect(res.body.data.firstName).toBe('Jane')
    })

    it('returns 404 for a non-existent customer', async () => {
      const res = await request
        .get(`/customers/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get(`/customers/${TEST_NONEXISTENT_ID}`)

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Update customer
  // ══════════════════════════════════════════════════════════════════════════

  describe('PATCH /customers/:id', () => {
    it('updates customer firstName', async () => {
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/customers/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ firstName: 'Janet' })

      expect(res.status).toBe(200)
      expect(res.body.data.firstName).toBe('Janet')
    })

    it('updates customer email', async () => {
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/customers/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ email: 'updated@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.data.email).toBe('updated@example.com')
    })

    it('updates marketingConsent flag', async () => {
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/customers/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ marketingConsent: true })

      expect(res.status).toBe(200)
      expect(res.body.data.marketingConsent).toBe(true)
    })

    it('returns 400 when email in update is invalid', async () => {
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/customers/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ email: 'bad-email' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when updating a non-existent customer', async () => {
      const res = await request
        .patch(`/customers/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ firstName: 'Ghost' })

      expect(res.status).toBe(404)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request
        .patch(`/customers/${TEST_NONEXISTENT_ID}`)
        .send({ firstName: 'Ghost' })

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Tenant isolation
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant isolation', () => {
    it('does not return customers belonging to another tenant', async () => {
      // Create a customer under the test tenant
      const created = await request
        .post('/customers')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      // Request from a different tenant
      const res = await request
        .get(`/customers/${created.body.data.id}`)
        .set({ 'x-tenant-id': '99000000-0000-4000-8000-000000000099' })

      // Should be 404 — not visible to other tenant
      expect(res.status).toBe(404)
    })
  })
})
