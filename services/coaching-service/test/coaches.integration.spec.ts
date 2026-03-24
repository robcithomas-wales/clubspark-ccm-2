import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCoaches, cleanLessonTypes } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_COACH = {
  displayName: 'Alice Trainer',
  bio: 'Specialist in junior tennis',
  specialties: ['tennis', 'junior coaching'],
  isActive: true,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Coaches — integration', () => {
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

  describe('POST /coaches', () => {
    it('creates a coach and returns 201 with an id', async () => {
      const res = await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.displayName).toBe('Alice Trainer')
      expect(res.body.data.specialties).toEqual(['tennis', 'junior coaching'])
      expect(res.body.data.isActive).toBe(true)
    })

    it('defaults isActive to true when not provided', async () => {
      const res = await request
        .post('/coaches')
        .set(JSON_HEADERS)
        .send({ displayName: 'Bob Coach' })

      expect(res.status).toBe(201)
      expect(res.body.data.isActive).toBe(true)
    })

    it('returns 400 when displayName is missing', async () => {
      const res = await request
        .post('/coaches')
        .set(JSON_HEADERS)
        .send({ bio: 'No name provided' })

      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.post('/coaches').send(VALID_COACH)
      expect(res.status).toBe(401)
    })

    it('creates a coach with associated lesson types', async () => {
      // First create a lesson type
      const ltRes = await request
        .post('/lesson-types')
        .set(JSON_HEADERS)
        .send({ name: 'Junior Tennis', durationMinutes: 60, pricePerSession: 30 })
      expect(ltRes.status).toBe(201)
      const ltId = ltRes.body.data.id

      const res = await request
        .post('/coaches')
        .set(JSON_HEADERS)
        .send({ ...VALID_COACH, lessonTypeIds: [ltId] })

      expect(res.status).toBe(201)
      expect(res.body.data.lessonTypes).toHaveLength(1)
      expect(res.body.data.lessonTypes[0].lessonType.id).toBe(ltId)
    })
  })

  // ── List ──────────────────────────────────────────────────────────────────

  describe('GET /coaches', () => {
    it('returns an empty list when no coaches exist', async () => {
      const res = await request.get('/coaches').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('lists coaches for the tenant', async () => {
      await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)
      await request.post('/coaches').set(JSON_HEADERS).send({ displayName: 'Coach B' })

      const res = await request.get('/coaches').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('filters out inactive coaches with activeOnly=true (default)', async () => {
      await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)
      await request.post('/coaches').set(JSON_HEADERS).send({ displayName: 'Inactive', isActive: false })

      const res = await request.get('/coaches?activeOnly=true').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].displayName).toBe('Alice Trainer')
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/coaches')
      expect(res.status).toBe(401)
    })
  })

  // ── Get by ID ─────────────────────────────────────────────────────────────

  describe('GET /coaches/:id', () => {
    it('retrieves a coach by id', async () => {
      const created = await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)
      const id = created.body.data.id

      const res = await request.get(`/coaches/${id}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.displayName).toBe('Alice Trainer')
    })

    it('returns 404 for a non-existent coach', async () => {
      const res = await request.get(`/coaches/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PATCH /coaches/:id', () => {
    it('updates coach bio and specialties', async () => {
      const created = await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)
      const id = created.body.data.id

      const res = await request
        .patch(`/coaches/${id}`)
        .set(JSON_HEADERS)
        .send({ bio: 'Updated bio', specialties: ['padel'] })

      expect(res.status).toBe(200)
      expect(res.body.data.bio).toBe('Updated bio')
      expect(res.body.data.specialties).toEqual(['padel'])
    })

    it('deactivates a coach', async () => {
      const created = await request.post('/coaches').set(JSON_HEADERS).send(VALID_COACH)
      const id = created.body.data.id

      const res = await request
        .patch(`/coaches/${id}`)
        .set(JSON_HEADERS)
        .send({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.isActive).toBe(false)
    })

    it('returns 404 for a non-existent coach', async () => {
      const res = await request
        .patch(`/coaches/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ bio: 'Ghost update' })
      expect(res.status).toBe(404)
    })
  })
})
