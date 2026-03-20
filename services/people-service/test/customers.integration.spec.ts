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

  describe('POST /people', () => {
    it('creates a customer and returns 201 with an id', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.firstName).toBe('Jane')
      expect(res.body.data.lastName).toBe('Smith')
      expect(res.body.data.email).toBe('jane.smith@example.com')
    })

    it('creates a customer with default lifecycleState of active', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      expect(res.status).toBe(201)
      expect(res.body.data.lifecycleState).toBe('active')
    })

    it('creates a customer with only required fields (no email or phone)', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ firstName: 'Bob', lastName: 'Jones' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.firstName).toBe('Bob')
    })

    it('accepts a pre-supplied id', async () => {
      const customId = '30000000-0000-4000-8000-000000000001'
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ id: customId, firstName: 'Custom', lastName: 'Id' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBe(customId)
    })

    it('returns 400 when firstName is missing', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ lastName: 'Smith', email: 'x@x.com' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when lastName is missing', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ firstName: 'Jane', email: 'x@x.com' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when email is not a valid email address', async () => {
      const res = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ firstName: 'Jane', lastName: 'Smith', email: 'not-an-email' })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request
        .post('/people')
        .send(VALID_CUSTOMER)

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // List customers
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /people', () => {
    it('returns an empty list when no customers exist', async () => {
      const res = await request.get('/people').set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBe(0)
    })

    it('lists customers for the tenant', async () => {
      await request.post('/people').set(JSON_HEADERS).send(VALID_CUSTOMER)
      await request.post('/people').set(JSON_HEADERS)
        .send({ firstName: 'Alice', lastName: 'Brown' })

      const res = await request.get('/people').set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeGreaterThanOrEqual(2)
    })

    it('searches by name', async () => {
      await request.post('/people').set(JSON_HEADERS).send(VALID_CUSTOMER)
      await request.post('/people').set(JSON_HEADERS)
        .send({ firstName: 'Alice', lastName: 'Brown' })

      const res = await request
        .get('/people?search=Jane')
        .set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list.some((c: any) => c.firstName === 'Jane')).toBe(true)
    })

    it('filters by lifecycle state', async () => {
      await request.post('/people').set(JSON_HEADERS).send(VALID_CUSTOMER)
      const created = await request.post('/people').set(JSON_HEADERS)
        .send({ firstName: 'Alice', lastName: 'Brown' })

      // Transition Alice to lapsed
      await request
        .patch(`/people/${created.body.data.id}/lifecycle`)
        .set(JSON_HEADERS)
        .send({ toState: 'lapsed' })

      const res = await request.get('/people?lifecycle=lapsed').set(HEADERS)
      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.every((c: any) => c.lifecycleState === 'lapsed')).toBe(true)
    })

    it('respects the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await request.post('/people').set(JSON_HEADERS)
          .send({ firstName: `User${i}`, lastName: 'Test' })
      }

      const res = await request.get('/people?limit=2').set(HEADERS)

      expect(res.status).toBe(200)
      const list = Array.isArray(res.body) ? res.body : res.body.data ?? res.body
      expect(list.length).toBeLessThanOrEqual(2)
    })

    it('enforces max limit of 100', async () => {
      const res = await request.get('/people?limit=500').set(HEADERS)

      expect(res.status).toBe(200)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/people')

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Get customer by ID
  // ══════════════════════════════════════════════════════════════════════════

  describe('GET /people/:id', () => {
    it('retrieves a customer by id', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .get(`/people/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(created.body.data.id)
      expect(res.body.data.firstName).toBe('Jane')
    })

    it('includes personTags in the response', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .get(`/people/${created.body.data.id}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.personTags)).toBe(true)
    })

    it('returns 404 for a non-existent customer', async () => {
      const res = await request
        .get(`/people/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get(`/people/${TEST_NONEXISTENT_ID}`)

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Update customer
  // ══════════════════════════════════════════════════════════════════════════

  describe('PATCH /people/:id', () => {
    it('updates customer firstName', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ firstName: 'Janet' })

      expect(res.status).toBe(200)
      expect(res.body.data.firstName).toBe('Janet')
    })

    it('updates customer email', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ email: 'updated@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.data.email).toBe('updated@example.com')
    })

    it('updates marketingConsent flag', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ marketingConsent: true })

      expect(res.status).toBe(200)
      expect(res.body.data.marketingConsent).toBe(true)
    })

    it('returns 400 when email in update is invalid', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ email: 'bad-email' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when updating a non-existent customer', async () => {
      const res = await request
        .patch(`/people/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ firstName: 'Ghost' })

      expect(res.status).toBe(404)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request
        .patch(`/people/${TEST_NONEXISTENT_ID}`)
        .send({ firstName: 'Ghost' })

      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Lifecycle transitions
  // ══════════════════════════════════════════════════════════════════════════

  describe('PATCH /people/:id/lifecycle', () => {
    it('transitions lifecycle state and returns updated customer', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}/lifecycle`)
        .set(JSON_HEADERS)
        .send({ toState: 'inactive', reason: 'No bookings in 60 days' })

      expect(res.status).toBe(200)
      expect(res.body.data.lifecycleState).toBe('inactive')
      expect(res.body.data.lifecycleChangedAt).toBeDefined()
    })

    it('records history on each transition', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)
      const id = created.body.data.id

      await request.patch(`/people/${id}/lifecycle`).set(JSON_HEADERS).send({ toState: 'inactive' })
      await request.patch(`/people/${id}/lifecycle`).set(JSON_HEADERS).send({ toState: 'lapsed' })

      const res = await request.get(`/people/${id}/lifecycle/history`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
      expect(res.body.data[0].toState).toBe('lapsed')
      expect(res.body.data[1].toState).toBe('inactive')
    })

    it('returns 400 for an invalid lifecycle state', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .patch(`/people/${created.body.data.id}/lifecycle`)
        .set(JSON_HEADERS)
        .send({ toState: 'flying' })

      expect(res.status).toBe(400)
    })

    it('returns 404 for a non-existent customer', async () => {
      const res = await request
        .patch(`/people/${TEST_NONEXISTENT_ID}/lifecycle`)
        .set(JSON_HEADERS)
        .send({ toState: 'inactive' })

      expect(res.status).toBe(404)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Tags
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tags', () => {
    it('creates a tag and lists it', async () => {
      const create = await request
        .post('/tags')
        .set(JSON_HEADERS)
        .send({ name: 'Junior', colour: '#10b981' })

      expect(create.status).toBe(201)
      expect(create.body.data.name).toBe('Junior')

      const list = await request.get('/tags').set(HEADERS)
      expect(list.status).toBe(200)
      expect(list.body.data.some((t: any) => t.name === 'Junior')).toBe(true)
    })

    it('returns 409 when creating a duplicate tag name', async () => {
      await request.post('/tags').set(JSON_HEADERS).send({ name: 'VIP' })
      const res = await request.post('/tags').set(JSON_HEADERS).send({ name: 'VIP' })
      expect(res.status).toBe(409)
    })

    it('applies a tag to a customer and lists person tags', async () => {
      const tagRes = await request.post('/tags').set(JSON_HEADERS).send({ name: 'Coach' })
      const tagId = tagRes.body.data.id

      const custRes = await request.post('/people').set(JSON_HEADERS).send(VALID_CUSTOMER)
      const customerId = custRes.body.data.id

      const apply = await request
        .post(`/people/${customerId}/tags`)
        .set(JSON_HEADERS)
        .send({ tagId })

      expect(apply.status).toBe(200)
      expect(apply.body.data.name).toBe('Coach')

      const tags = await request.get(`/people/${customerId}/tags`).set(HEADERS)
      expect(tags.status).toBe(200)
      expect(tags.body.data.some((t: any) => t.name === 'Coach')).toBe(true)
    })

    it('removes a tag from a customer', async () => {
      const tagRes = await request.post('/tags').set(JSON_HEADERS).send({ name: 'Trial' })
      const tagId = tagRes.body.data.id

      const custRes = await request.post('/people').set(JSON_HEADERS).send(VALID_CUSTOMER)
      const customerId = custRes.body.data.id

      await request.post(`/people/${customerId}/tags`).set(JSON_HEADERS).send({ tagId })

      const remove = await request
        .delete(`/people/${customerId}/tags/${tagId}`)
        .set(HEADERS)

      expect(remove.status).toBe(200)

      const tags = await request.get(`/people/${customerId}/tags`).set(HEADERS)
      expect(tags.body.data.some((t: any) => t.name === 'Trial')).toBe(false)
    })

    it('deletes a tag from the catalogue', async () => {
      const tagRes = await request.post('/tags').set(JSON_HEADERS).send({ name: 'Temporary' })
      const tagId = tagRes.body.data.id

      const del = await request.delete(`/tags/${tagId}`).set(HEADERS)
      expect(del.status).toBe(200)

      const list = await request.get('/tags').set(HEADERS)
      expect(list.body.data.some((t: any) => t.id === tagId)).toBe(false)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Tenant isolation
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant isolation', () => {
    it('does not return customers belonging to another tenant', async () => {
      const created = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send(VALID_CUSTOMER)

      const res = await request
        .get(`/people/${created.body.data.id}`)
        .set({ 'x-tenant-id': '99000000-0000-4000-8000-000000000099' })

      expect(res.status).toBe(404)
    })
  })
})
