import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCustomers, cleanSegments } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const STATIC_SEGMENT = {
  name: 'VIP Members',
  description: 'Hand-curated list of high-value members',
  type: 'static',
}

const DYNAMIC_SEGMENT = {
  name: 'Active Adults',
  type: 'dynamic',
  conditions: [{ field: 'lifecycleState', op: 'eq', value: 'active' }],
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Segments — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await prisma.$connect()
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanSegments()
    await cleanCustomers()
  })
  afterAll(async () => { await cleanSegments(); await cleanCustomers(); await prisma.$disconnect(); await closeApp() })

  describe('POST /segments', () => {
    it('creates a static segment and returns 201', async () => {
      const res = await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('VIP Members')
      expect(res.body.data.type).toBe('static')
    })

    it('creates a dynamic segment with conditions', async () => {
      const res = await request.post('/segments').set(JSON_HEADERS).send(DYNAMIC_SEGMENT)

      expect(res.status).toBe(201)
      expect(res.body.data.type).toBe('dynamic')
      expect(Array.isArray(res.body.data.conditions)).toBe(true)
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/segments')
        .set(JSON_HEADERS)
        .send({ type: 'static' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/segments').send(STATIC_SEGMENT)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /segments', () => {
    it('lists all segments for the tenant', async () => {
      await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)

      const res = await request.get('/segments').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/segments')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /segments/:id', () => {
    it('returns a segment by id', async () => {
      const created = await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)
      const id = created.body.data.id

      const res = await request.get(`/segments/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.name).toBe('VIP Members')
    })

    it('returns 404 for a non-existent segment', async () => {
      const res = await request.get(`/segments/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /segments/:id', () => {
    it('updates segment name and description', async () => {
      const created = await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)
      const id = created.body.data.id

      const res = await request
        .patch(`/segments/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Updated VIPs', description: 'Updated description' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Updated VIPs')
    })

    it('returns 404 for a non-existent segment', async () => {
      const res = await request
        .patch(`/segments/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('Segment members', () => {
    it('adds a member to a static segment and lists them', async () => {
      // Create a person first
      const person = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' })
      const personId = person.body.data.id

      const seg = await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)
      const segId = seg.body.data.id

      const add = await request
        .post(`/segments/${segId}/members`)
        .set(JSON_HEADERS)
        .send({ personId })

      expect(add.status).toBe(201)

      const members = await request.get(`/segments/${segId}/members`).set(HEADERS)
      expect(members.status).toBe(200)
      expect(Array.isArray(members.body.data)).toBe(true)
      expect(members.body.data.some((m: any) => m.personId === personId)).toBe(true)
    })

    it('removes a member from a segment', async () => {
      const person = await request
        .post('/people')
        .set(JSON_HEADERS)
        .send({ firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' })
      const personId = person.body.data.id

      const seg = await request.post('/segments').set(JSON_HEADERS).send(STATIC_SEGMENT)
      const segId = seg.body.data.id

      await request.post(`/segments/${segId}/members`).set(JSON_HEADERS).send({ personId })

      const del = await request
        .delete(`/segments/${segId}/members/${personId}`)
        .set(HEADERS)

      expect(del.status).toBe(204)

      const members = await request.get(`/segments/${segId}/members`).set(HEADERS)
      expect(members.body.data).toHaveLength(0)
    })

    it('returns 404 when segment does not exist', async () => {
      const res = await request.get(`/segments/${TEST_NONEXISTENT_ID}/members`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /segments/:id/rebuild', () => {
    it('rebuilds a dynamic segment and returns member count', async () => {
      const seg = await request.post('/segments').set(JSON_HEADERS).send(DYNAMIC_SEGMENT)
      const id = seg.body.data.id

      const res = await request.post(`/segments/${id}/rebuild`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.rebuilt).toBeDefined()
      expect(typeof res.body.rebuilt).toBe('number')
    })

    it('returns 404 for a non-existent segment', async () => {
      const res = await request.post(`/segments/${TEST_NONEXISTENT_ID}/rebuild`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })
})
