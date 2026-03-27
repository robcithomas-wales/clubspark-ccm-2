import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Sessions — integration', () => {
  let request: ReturnType<typeof supertest>
  let coachId: string
  let lessonTypeId: string

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

  async function setup() {
    // Create a coach and lesson type to use in session tests
    const coachRes = await request
      .post('/coaches')
      .set(JSON_HEADERS)
      .send({ displayName: 'Test Coach', isActive: true })
    coachId = coachRes.body.data.id

    const typeRes = await request
      .post('/lesson-types')
      .set(JSON_HEADERS)
      .send({ name: 'Tennis Lesson', durationMinutes: 60, pricePerSession: 40 })
    lessonTypeId = typeRes.body.data.id
  }

  function sessionPayload(overrides: Record<string, unknown> = {}) {
    const now = new Date()
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow
    const end = new Date(start.getTime() + 60 * 60 * 1000) // +1 hour
    return {
      coachId,
      lessonTypeId,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      ...overrides,
    }
  }

  // ── GET /sessions ──────────────────────────────────────────────────────────

  describe('GET /sessions', () => {
    it('returns empty list when no sessions exist', async () => {
      const res = await request.get('/sessions').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('returns 401 without tenant header', async () => {
      const res = await request.get('/sessions')
      expect(res.status).toBe(401)
    })
  })

  // ── POST /sessions ─────────────────────────────────────────────────────────

  describe('POST /sessions', () => {
    it('creates a session with required fields', async () => {
      await setup()
      const res = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      expect(res.status).toBe(201)
      expect(res.body.data.coachId).toBe(coachId)
      expect(res.body.data.lessonTypeId).toBe(lessonTypeId)
      expect(res.body.data.status).toBe('scheduled')
      expect(res.body.data.paymentStatus).toBe('unpaid')
      expect(res.body.data.coach.displayName).toBe('Test Coach')
      expect(res.body.data.lessonType.name).toBe('Tennis Lesson')
    })

    it('returns 400 when coachId is missing', async () => {
      await setup()
      const res = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send({ lessonTypeId, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() })
      expect(res.status).toBe(400)
    })

    it('returns 400 when startsAt is missing', async () => {
      await setup()
      const res = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send({ coachId, lessonTypeId, endsAt: new Date().toISOString() })
      expect(res.status).toBe(400)
    })

    it('creates a session with optional customerId and notes', async () => {
      await setup()
      const res = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send(sessionPayload({
          customerId: '50000000-0000-4000-8000-000000000099',
          notes: 'Beginner level',
          priceCharged: 35,
        }))
      expect(res.status).toBe(201)
      expect(res.body.data.customerId).toBe('50000000-0000-4000-8000-000000000099')
      expect(res.body.data.notes).toBe('Beginner level')
    })
  })

  // ── GET /sessions/:id ──────────────────────────────────────────────────────

  describe('GET /sessions/:id', () => {
    it('returns 404 for a non-existent session', async () => {
      const res = await request.get(`/sessions/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })

    it('returns the session when it exists', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      const id = created.body.data.id

      const res = await request.get(`/sessions/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
    })
  })

  // ── PATCH /sessions/:id ────────────────────────────────────────────────────

  describe('PATCH /sessions/:id', () => {
    it('updates status to confirmed', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      const id = created.body.data.id

      const res = await request
        .patch(`/sessions/${id}`)
        .set(JSON_HEADERS)
        .send({ status: 'confirmed' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('confirmed')
    })

    it('updates status to completed with payment', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      const id = created.body.data.id

      const res = await request
        .patch(`/sessions/${id}`)
        .set(JSON_HEADERS)
        .send({ status: 'completed', paymentStatus: 'paid' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('completed')
      expect(res.body.data.paymentStatus).toBe('paid')
    })

    it('records cancellation reason', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      const id = created.body.data.id

      const res = await request
        .patch(`/sessions/${id}`)
        .set(JSON_HEADERS)
        .send({ status: 'cancelled', cancellationReason: 'Coach unavailable' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('cancelled')
      expect(res.body.data.cancellationReason).toBe('Coach unavailable')
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request
        .patch(`/sessions/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ status: 'confirmed' })
      expect(res.status).toBe(404)
    })
  })

  // ── DELETE /sessions/:id ───────────────────────────────────────────────────

  describe('DELETE /sessions/:id', () => {
    it('deletes an existing session', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      const id = created.body.data.id

      const delRes = await request.delete(`/sessions/${id}`).set(HEADERS)
      expect(delRes.status).toBe(204)

      const getRes = await request.get(`/sessions/${id}`).set(HEADERS)
      expect(getRes.status).toBe(404)
    })

    it('returns 404 when deleting a non-existent session', async () => {
      const res = await request.delete(`/sessions/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── Filtering ──────────────────────────────────────────────────────────────

  describe('GET /sessions filtering', () => {
    it('filters sessions by coachId', async () => {
      await setup()
      await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())

      const res = await request
        .get(`/sessions?coachId=${coachId}`)
        .set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].coachId).toBe(coachId)
    })

    it('filters sessions by status', async () => {
      await setup()
      const created = await request.post('/sessions').set(JSON_HEADERS).send(sessionPayload())
      await request
        .patch(`/sessions/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ status: 'completed' })

      const res = await request.get('/sessions?status=completed').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((s: any) => s.status === 'completed')).toBe(true)
    })
  })
})
