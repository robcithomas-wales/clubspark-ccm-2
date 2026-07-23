import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, seedFixtures, teardownFixtures, cleanSessions } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
  TEST_NONEXISTENT_ID,
} from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID, 'x-organisation-id': TEST_ORG_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const SESSION = {
  venueId: TEST_VENUE_ID,
  resourceId: TEST_RESOURCE_ID,
  bookableUnitId: TEST_UNIT_ID,
  name: 'Monday Padel Doubles',
  startsAt: '2099-07-07T17:00:00Z',
  endsAt: '2099-07-07T18:00:00Z',
  pricePerParticipant: 8.00,
  maxParticipants: 8,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Sessions — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanSessions)
  afterAll(async () => { await teardownFixtures(); await prisma.$disconnect(); await closeApp() })

  describe('POST /sessions', () => {
    it('creates a session and returns it', async () => {
      const res = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Monday Padel Doubles')
      expect(res.body.data.status).toBe('open')
      expect(res.body.data.maxParticipants).toBe(8)
    })

    it('returns 400 when endsAt is before startsAt', async () => {
      const res = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send({ ...SESSION, endsAt: '2099-07-07T16:00:00Z' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send({ name: 'Incomplete' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/sessions').send(SESSION)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /sessions', () => {
    it('lists sessions for the tenant', async () => {
      await request.post('/sessions').set(JSON_HEADERS).send(SESSION)

      const res = await request.get('/sessions').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters by status=open', async () => {
      await request.post('/sessions').set(JSON_HEADERS).send(SESSION)

      const res = await request.get('/sessions?status=open').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((s: any) => s.status === 'open')).toBe(true)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/sessions')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /sessions/:id', () => {
    it('returns a session with participants list', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      const res = await request.get(`/sessions/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(Array.isArray(res.body.data.participants)).toBe(true)
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request.get(`/sessions/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /sessions/:id', () => {
    it('updates session name and price', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      const res = await request
        .patch(`/sessions/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Updated Name', pricePerParticipant: 10.00 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Updated Name')
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request
        .patch(`/sessions/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /sessions/:id/join', () => {
    it('registers a participant and returns 201', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      const res = await request
        .post(`/sessions/${id}/join`)
        .set(JSON_HEADERS)
        .send({ participantName: 'Alice Doe', participantEmail: 'alice@example.com' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.participantName).toBe('Alice Doe')
    })

    it('returns 409 when session is full', async () => {
      // Create a session with capacity 1
      const created = await request
        .post('/sessions')
        .set(JSON_HEADERS)
        .send({ ...SESSION, maxParticipants: 1 })
      const id = created.body.data.id

      await request.post(`/sessions/${id}/join`).set(JSON_HEADERS).send({ participantName: 'First' })

      const res = await request
        .post(`/sessions/${id}/join`)
        .set(JSON_HEADERS)
        .send({ participantName: 'Second' })

      expect(res.status).toBe(409)
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request
        .post(`/sessions/${TEST_NONEXISTENT_ID}/join`)
        .set(JSON_HEADERS)
        .send({ participantName: 'Ghost' })

      expect(res.status).toBe(404)
    })
  })

  describe('GET /sessions/:id/participants', () => {
    it('lists participants after joining', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      await request.post(`/sessions/${id}/join`).set(JSON_HEADERS).send({ participantName: 'Alice' })
      await request.post(`/sessions/${id}/join`).set(JSON_HEADERS).send({ participantName: 'Bob' })

      const res = await request.get(`/sessions/${id}/participants`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      const names = res.body.data.map((p: any) => p.participantName)
      expect(names).toContain('Alice')
      expect(names).toContain('Bob')
    })
  })

  describe('POST /sessions/:id/cancel', () => {
    it('cancels an open session', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      const res = await request.post(`/sessions/${id}/cancel`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('cancelled')
    })

    it('returns 409 when session is already cancelled', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      await request.post(`/sessions/${id}/cancel`).set(HEADERS)

      const res = await request.post(`/sessions/${id}/cancel`).set(HEADERS)
      expect(res.status).toBe(409)
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request.post(`/sessions/${TEST_NONEXISTENT_ID}/cancel`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /sessions/:id/complete', () => {
    it('marks a session as completed', async () => {
      const created = await request.post('/sessions').set(JSON_HEADERS).send(SESSION)
      const id = created.body.data.id

      const res = await request.post(`/sessions/${id}/complete`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('completed')
    })

    it('returns 404 for a non-existent session', async () => {
      const res = await request.post(`/sessions/${TEST_NONEXISTENT_ID}/complete`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })
})
