import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCoaches, cleanLessonTypes } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_LESSON_TYPE = {
  name: 'Adult Tennis — 1-to-1',
  sport: 'tennis',
  durationMinutes: 60,
  maxParticipants: 1,
  pricePerSession: 45,
  currency: 'GBP',
  isActive: true,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Lesson types — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanCoaches()
    await cleanLessonTypes()
  })

  afterAll(async () => {
    await cleanCoaches()
    await cleanLessonTypes()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Create ────────────────────────────────────────────────────────────────

  describe('POST /lesson-types', () => {
    it('creates a lesson type and returns 201', async () => {
      const res = await request.post('/lesson-types').set(JSON_HEADERS).send(VALID_LESSON_TYPE)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Adult Tennis — 1-to-1')
      expect(res.body.data.durationMinutes).toBe(60)
      expect(res.body.data.pricePerSession).toBe('45')
      expect(res.body.data.currency).toBe('GBP')
    })

    it('defaults maxParticipants to 1 and currency to GBP when not provided', async () => {
      const res = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'Quick Drill', durationMinutes: 30 })

      expect(res.status).toBe(201)
      expect(res.body.data.maxParticipants).toBe(1)
      expect(res.body.data.currency).toBe('GBP')
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ durationMinutes: 60 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when durationMinutes is missing', async () => {
      const res = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'No duration' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when durationMinutes is below minimum (5)', async () => {
      const res = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'Too short', durationMinutes: 3 })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.post('/lesson-types').send(VALID_LESSON_TYPE)
      expect(res.status).toBe(401)
    })
  })

  // ── List ──────────────────────────────────────────────────────────────────

  describe('GET /lesson-types', () => {
    it('returns an empty list when no lesson types exist', async () => {
      const res = await request.get('/lesson-types').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('lists lesson types for the tenant', async () => {
      await request.post('/lesson-types').set(JSON_HEADERS).send(VALID_LESSON_TYPE)
      await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'Group Session', durationMinutes: 90 })

      const res = await request.get('/lesson-types').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('filters by sport', async () => {
      await request.post('/lesson-types').set(JSON_HEADERS).send(VALID_LESSON_TYPE)
      await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'Padel Lesson', sport: 'padel', durationMinutes: 60 })

      const res = await request.get('/lesson-types?sport=tennis').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].sport).toBe('tennis')
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/lesson-types')
      expect(res.status).toBe(401)
    })
  })

  // ── Get by ID ─────────────────────────────────────────────────────────────

  describe('GET /lesson-types/:id', () => {
    it('retrieves a lesson type by id', async () => {
      const created = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send(VALID_LESSON_TYPE)
      const id = created.body.data.id

      const res = await request.get(`/lesson-types/${id}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.name).toBe('Adult Tennis — 1-to-1')
    })

    it('returns 404 for a non-existent lesson type', async () => {
      const res = await request.get(`/lesson-types/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PATCH /lesson-types/:id', () => {
    it('updates name and price', async () => {
      const created = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send(VALID_LESSON_TYPE)
      const id = created.body.data.id

      const res = await request
        .patch(`/lesson-types/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Premium Tennis — 1-to-1', pricePerSession: 55 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Premium Tennis — 1-to-1')
      expect(res.body.data.pricePerSession).toBe('55')
    })

    it('deactivates a lesson type', async () => {
      const created = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send(VALID_LESSON_TYPE)
      const id = created.body.data.id

      const res = await request
        .patch(`/lesson-types/${id}`)
        .set(JSON_HEADERS)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })

    it('returns 404 for a non-existent lesson type', async () => {
      const res = await request
        .patch(`/lesson-types/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })
      expect(res.status).toBe(404)
    })
  })
})
