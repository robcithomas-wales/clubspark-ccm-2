import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, seedFixtures, teardownFixtures, cleanBookings } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
  TEST_NONEXISTENT_ID,
  SLOT_START,
  SLOT_END,
} from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID, 'x-organisation-id': TEST_ORG_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const BOOKING_PAYLOAD = {
  venueId: TEST_VENUE_ID,
  resourceId: TEST_RESOURCE_ID,
  bookableUnitId: TEST_UNIT_ID,
  startsAt: SLOT_START,
  endsAt: SLOT_END,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Booking Participants — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanBookings)
  afterAll(async () => { await teardownFixtures(); await prisma.$disconnect(); await closeApp() })

  describe('GET /bookings/:id/participants', () => {
    it('returns an empty list for a new booking', async () => {
      const created = await request.post('/bookings').set(JSON_HEADERS).send(BOOKING_PAYLOAD)
      expect(created.status).toBe(201)
      const id = created.body.data.id

      const res = await request.get(`/bookings/${id}/participants`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toHaveLength(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get(`/bookings/${TEST_NONEXISTENT_ID}/participants`)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /bookings/:id/participants', () => {
    it('adds a participant and returns 201', async () => {
      const created = await request.post('/bookings').set(JSON_HEADERS).send(BOOKING_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .post(`/bookings/${id}/participants`)
        .set(JSON_HEADERS)
        .send({ name: 'Alice Smith', email: 'alice@example.com' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Alice Smith')
    })

    it('participant appears in subsequent list', async () => {
      const created = await request.post('/bookings').set(JSON_HEADERS).send(BOOKING_PAYLOAD)
      const id = created.body.data.id

      await request.post(`/bookings/${id}/participants`).set(JSON_HEADERS).send({ name: 'Alice' })
      await request.post(`/bookings/${id}/participants`).set(JSON_HEADERS).send({ name: 'Bob' })

      const list = await request.get(`/bookings/${id}/participants`).set(HEADERS)
      expect(list.body.data).toHaveLength(2)
      const names = list.body.data.map((p: any) => p.name)
      expect(names).toContain('Alice')
      expect(names).toContain('Bob')
    })

    it('returns 400 when name is missing', async () => {
      const created = await request.post('/bookings').set(JSON_HEADERS).send(BOOKING_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .post(`/bookings/${id}/participants`)
        .set(JSON_HEADERS)
        .send({ email: 'no-name@example.com' })

      expect(res.status).toBe(400)
    })

    it('returns 404 for a non-existent booking', async () => {
      const res = await request
        .post(`/bookings/${TEST_NONEXISTENT_ID}/participants`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request
        .post(`/bookings/${TEST_NONEXISTENT_ID}/participants`)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /bookings/:id/participants/:participantId', () => {
    it('removes a participant and returns 204', async () => {
      const created = await request.post('/bookings').set(JSON_HEADERS).send(BOOKING_PAYLOAD)
      const id = created.body.data.id

      const added = await request
        .post(`/bookings/${id}/participants`)
        .set(JSON_HEADERS)
        .send({ name: 'Dave' })
      const participantId = added.body.data.id

      const del = await request
        .delete(`/bookings/${id}/participants/${participantId}`)
        .set(HEADERS)

      expect(del.status).toBe(204)

      const list = await request.get(`/bookings/${id}/participants`).set(HEADERS)
      expect(list.body.data).toHaveLength(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request.delete(`/bookings/${TEST_NONEXISTENT_ID}/participants/${TEST_NONEXISTENT_ID}`)
      expect(res.status).toBe(401)
    })
  })
})
