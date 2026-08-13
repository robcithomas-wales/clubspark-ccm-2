import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanPricingRules } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const RULE = {
  name: 'Peak hours — weekday evenings',
  label: 'Peak',
  scopeType: 'organisation',
  daysOfWeek: [1, 2, 3, 4, 5],
  timeFrom: '17:00',
  timeTo: '22:00',
  ratePerHour: 18.00,
  currency: 'GBP',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Pricing Rules — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanPricingRules)
  afterAll(async () => { await cleanPricingRules(); await prisma.$disconnect(); await closeApp() })

  describe('POST /pricing-rules', () => {
    it('creates a pricing rule and returns it', async () => {
      const res = await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe(RULE.name)
      expect(res.body.data.scopeType).toBe('organisation')
      expect(res.body.data.isActive).toBe(true)
    })

    it('returns 400 when ratePerHour is missing', async () => {
      const res = await request
        .post('/v1/pricing-rules')
        .set(JSON_HEADERS)
        .send({ name: 'Incomplete', scopeType: 'organisation', daysOfWeek: [] })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/v1/pricing-rules').send(RULE)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /pricing-rules', () => {
    it('lists all pricing rules for the tenant', async () => {
      await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)

      const res = await request.get('/v1/pricing-rules').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.total).toBeGreaterThanOrEqual(1)
    })

    it('returns empty list when no rules exist', async () => {
      const res = await request.get('/v1/pricing-rules').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/v1/pricing-rules')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /pricing-rules/:id', () => {
    it('returns a rule by id', async () => {
      const created = await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)
      const id = created.body.data.id

      const res = await request.get(`/v1/pricing-rules/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.name).toBe(RULE.name)
    })

    it('returns 404 for a non-existent rule', async () => {
      const res = await request.get(`/v1/pricing-rules/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /pricing-rules/:id', () => {
    it('updates a rule name and rate', async () => {
      const created = await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)
      const id = created.body.data.id

      const res = await request
        .patch(`/v1/pricing-rules/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Off-peak', ratePerHour: 10.00 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Off-peak')
    })

    it('deactivates a rule', async () => {
      const created = await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)
      const id = created.body.data.id

      const res = await request
        .patch(`/v1/pricing-rules/${id}`)
        .set(JSON_HEADERS)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })

    it('returns 404 for a non-existent rule', async () => {
      const res = await request
        .patch(`/v1/pricing-rules/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /pricing-rules/:id', () => {
    it('deletes a rule and returns 204', async () => {
      const created = await request.post('/v1/pricing-rules').set(JSON_HEADERS).send(RULE)
      const id = created.body.data.id

      const del = await request.delete(`/v1/pricing-rules/${id}`).set(HEADERS)
      expect(del.status).toBe(204)

      const get = await request.get(`/v1/pricing-rules/${id}`).set(HEADERS)
      expect(get.status).toBe(404)
    })

    it('returns 404 for a non-existent rule', async () => {
      const res = await request.delete(`/v1/pricing-rules/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })
})
