import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import {
  prisma,
  seedFixtures,
  cleanBookings,
  cleanBookingRules,
  teardownFixtures,
  checkDbAvailable,
} from './helpers/db.js'
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

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

/** A booking for the standard test slot (1 hour). bookingSource is not 'admin' so rules apply. */
function standardBooking(overrides: Record<string, unknown> = {}) {
  return {
    venueId: TEST_VENUE_ID,
    resourceId: TEST_RESOURCE_ID,
    bookableUnitId: TEST_UNIT_ID,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    ...overrides,
  }
}

/** A booking rule payload for a resource-scoped 'everyone' rule. */
function rulePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Rule',
    subjectType: 'everyone',
    scopeType: 'resource',
    scopeId: TEST_RESOURCE_ID,
    canBook: true,
    requiresApproval: false,
    allowSeries: false,
    priority: 1,
    isActive: true,
    ...overrides,
  }
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Booking rules — integration (enforcement at booking time)', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanBookings()
    await cleanBookingRules()
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  describe('POST /booking-rules', () => {
    it('creates a booking rule and returns 201', async () => {
      const res = await request.post('/booking-rules').set(JSON_HEADERS).send(rulePayload())
      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Test Rule')
      expect(res.body.data.canBook).toBe(true)
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send({ name: 'Incomplete' })
      expect(res.status).toBe(400)
    })

    it('returns 401 without tenant header', async () => {
      const res = await request
        .post('/booking-rules')
        .set('content-type', 'application/json')
        .send(rulePayload())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /booking-rules', () => {
    it('lists all rules for the tenant', async () => {
      await request.post('/booking-rules').set(JSON_HEADERS).send(rulePayload())
      const res = await request.get('/booking-rules').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /booking-rules/:id', () => {
    it('returns a rule by id', async () => {
      const created = await request.post('/booking-rules').set(JSON_HEADERS).send(rulePayload())
      const id = created.body.data.id
      const res = await request.get(`/booking-rules/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
    })

    it('returns 404 for non-existent rule', async () => {
      const res = await request.get(`/booking-rules/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /booking-rules/:id', () => {
    it('updates rule name', async () => {
      const created = await request.post('/booking-rules').set(JSON_HEADERS).send(rulePayload())
      const id = created.body.data.id
      const res = await request
        .patch(`/booking-rules/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Updated Rule' })
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Updated Rule')
    })
  })

  describe('DELETE /booking-rules/:id', () => {
    it('deletes a rule and returns 204', async () => {
      const created = await request.post('/booking-rules').set(JSON_HEADERS).send(rulePayload())
      const id = created.body.data.id
      const del = await request.delete(`/booking-rules/${id}`).set(HEADERS)
      expect(del.status).toBe(204)
      const get = await request.get(`/booking-rules/${id}`).set(HEADERS)
      expect(get.status).toBe(404)
    })
  })

  // ── Enforcement at booking time ───────────────────────────────────────────────

  describe('Enforcement: canBook = false', () => {
    it('returns 403 when a blocking rule exists for the resource', async () => {
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ canBook: false }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(403)
    })

    it('admin source bypasses the canBook=false rule', async () => {
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ canBook: false }))

      const res = await request
        .post('/bookings')
        .set(JSON_HEADERS)
        .send(standardBooking({ bookingSource: 'admin' }))
      expect(res.status).toBe(201)
    })

    it('allows booking when no rule exists', async () => {
      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(201)
    })
  })

  describe('Enforcement: maxSlotMinutes', () => {
    it('returns 403 when slot duration exceeds maxSlotMinutes', async () => {
      // SLOT_START → SLOT_END is 60 minutes; rule caps at 30
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ maxSlotMinutes: 30 }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(403)
    })

    it('allows booking when slot duration is within maxSlotMinutes', async () => {
      // 90-minute cap — our 60-minute slot is fine
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ maxSlotMinutes: 90 }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(201)
    })
  })

  describe('Enforcement: minSlotMinutes', () => {
    it('returns 403 when slot duration is below minSlotMinutes', async () => {
      // SLOT is 60 minutes; rule requires at least 90
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ minSlotMinutes: 90 }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(403)
    })
  })

  describe('Enforcement: advanceDays', () => {
    it('returns 403 when booking is further ahead than advanceDays allows', async () => {
      // SLOT_START is 2099 — definitely more than 7 days ahead
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ advanceDays: 7 }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(403)
    })
  })

  describe('Enforcement: organisation-scoped rule', () => {
    it('a canBook=false org-level rule blocks any booking for this tenant', async () => {
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(
          rulePayload({
            name: 'Org Shutdown',
            scopeType: 'organisation',
            scopeId: undefined,
            canBook: false,
          }),
        )

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(403)
    })
  })

  describe('Enforcement: requiresApproval rule', () => {
    it('booking is created (service records the rule; status handled by caller)', async () => {
      // requiresApproval is detected but status is set by dto.status (CPO decision).
      // The booking still succeeds — the portal is responsible for passing status: 'pending'.
      await request
        .post('/booking-rules')
        .set(JSON_HEADERS)
        .send(rulePayload({ requiresApproval: true }))

      const res = await request.post('/bookings').set(JSON_HEADERS).send(standardBooking())
      expect(res.status).toBe(201)
    })
  })
})
