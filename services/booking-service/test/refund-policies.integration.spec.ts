import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanRefundPolicies } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const POLICY = {
  name: '24-hour full refund',
  hoursBeforeStart: 24,
  refundPct: 100,
  priority: 10,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Refund Policies — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanRefundPolicies)
  afterAll(async () => { await cleanRefundPolicies(); await prisma.$disconnect(); await closeApp() })

  describe('POST /refund-policies', () => {
    it('creates a refund policy and returns it', async () => {
      const res = await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe(POLICY.name)
      expect(res.body.data.hoursBeforeStart).toBe(24)
      expect(parseFloat(res.body.data.refundPct)).toBe(100)
      expect(res.body.data.isActive).toBe(true)
    })

    it('returns 400 when hoursBeforeStart is missing', async () => {
      const res = await request
        .post('/v1/refund-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Incomplete', refundPct: 50 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when refundPct exceeds 100', async () => {
      const res = await request
        .post('/v1/refund-policies')
        .set(JSON_HEADERS)
        .send({ name: 'Over 100', hoursBeforeStart: 24, refundPct: 110 })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/v1/refund-policies').send(POLICY)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /refund-policies', () => {
    it('lists all refund policies for the tenant', async () => {
      await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)

      const res = await request.get('/v1/refund-policies').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty list when no policies exist', async () => {
      const res = await request.get('/v1/refund-policies').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/v1/refund-policies')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /refund-policies/:id', () => {
    it('returns a policy by id', async () => {
      const created = await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)
      const id = created.body.data.id

      const res = await request.get(`/v1/refund-policies/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
    })

    it('returns 404 for a non-existent policy', async () => {
      const res = await request.get(`/v1/refund-policies/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /refund-policies/:id', () => {
    it('updates the refund percentage', async () => {
      const created = await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)
      const id = created.body.data.id

      const res = await request
        .patch(`/v1/refund-policies/${id}`)
        .set(JSON_HEADERS)
        .send({ refundPct: 50 })

      expect(res.status).toBe(200)
      expect(parseFloat(res.body.data.refundPct)).toBe(50)
    })

    it('deactivates a policy', async () => {
      const created = await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)
      const id = created.body.data.id

      const res = await request
        .patch(`/v1/refund-policies/${id}`)
        .set(JSON_HEADERS)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })

    it('returns 404 for a non-existent policy', async () => {
      const res = await request
        .patch(`/v1/refund-policies/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ refundPct: 50 })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /refund-policies/:id', () => {
    it('deletes a policy and returns 204', async () => {
      const created = await request.post('/v1/refund-policies').set(JSON_HEADERS).send(POLICY)
      const id = created.body.data.id

      const del = await request.delete(`/v1/refund-policies/${id}`).set(HEADERS)
      expect(del.status).toBe(204)

      const get = await request.get(`/v1/refund-policies/${id}`).set(HEADERS)
      expect(get.status).toBe(404)
    })

    it('returns 404 for a non-existent policy', async () => {
      const res = await request.delete(`/v1/refund-policies/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })
})
