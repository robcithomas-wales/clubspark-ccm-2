import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, cleanBookings, teardownFixtures } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
  TEST_UNIT_INACTIVE_ID,
  TEST_NONEXISTENT_ID,
  SLOT_START,
  SLOT_END,
  SLOT_OVERLAP_START,
  SLOT_OVERLAP_END,
  SLOT_ADJACENT_START,
  SLOT_ADJACENT_END,
  SLOT_NEXT_DAY_START,
  SLOT_NEXT_DAY_END,
} from './fixtures/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Tenant headers only — use for GET requests and no-body POST (cancel)
const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

// Tenant headers + JSON content-type — use for POST/PUT with a body
const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    venueId: TEST_VENUE_ID,
    resourceId: TEST_RESOURCE_ID,
    bookableUnitId: TEST_UNIT_ID,
    startsAt: SLOT_START,
    endsAt: SLOT_END,
    ...overrides,
  }
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('Bookings — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanBookings()
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Create — happy path ──────────────────────────────────────────────────

  it('creates a booking and returns 201 with a booking reference', async () => {
    const res = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send(bookingPayload())

    expect(res.status).toBe(201)
    expect(res.body.data.bookingReference).toMatch(/^BK-[0-9A-F]{10}$/)
    expect(res.body.data.status).toBe('active')
    expect(res.body.data.bookableUnitId).toBe(TEST_UNIT_ID)
  })

  it('returns the booking when fetched by id', async () => {
    const created = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send(bookingPayload())

    const id = created.body.data.id
    const res = await request.get(`/bookings/${id}`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(id)
  })

  // ── Create — conflict ────────────────────────────────────────────────────

  it('returns 409 BOOKING_CONFLICT when time slots overlap', async () => {
    // First booking succeeds
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())

    // Second booking overlaps
    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send(bookingPayload({ startsAt: SLOT_OVERLAP_START, endsAt: SLOT_OVERLAP_END }))

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('BOOKING_CONFLICT')
  })

  it('allows a booking that starts exactly when the previous one ends (adjacent)', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())

    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send(bookingPayload({ startsAt: SLOT_ADJACENT_START, endsAt: SLOT_ADJACENT_END }))

    expect(res.status).toBe(201)
  })

  it('allows re-booking the same slot after the first booking is cancelled', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    const res = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    expect(res.status).toBe(201)
  })

  // ── Create — validation errors ───────────────────────────────────────────

  it('returns 404 when bookable unit does not exist', async () => {
    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send(bookingPayload({ bookableUnitId: '00000000-0000-0000-0000-000000000000' }))

    expect(res.status).toBe(404)
  })

  it('returns 409 when bookable unit is inactive', async () => {
    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send(
        bookingPayload({
          bookableUnitId: TEST_UNIT_INACTIVE_ID,
        }),
      )

    expect(res.status).toBe(409)
  })

  it('returns 400 when venueId does not match the unit', async () => {
    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send(bookingPayload({ venueId: '00000000-0000-0000-0000-000000000001' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request
      .post('/bookings')
      .set(HEADERS)
      .send({ venueId: TEST_VENUE_ID })

    expect(res.status).toBe(400)
  })

  it('returns 401 when tenant headers are missing', async () => {
    const res = await request
      .post('/bookings')
      .set('content-type', 'application/json')
      .send(bookingPayload())

    expect(res.status).toBe(401)
  })

  // ── Cancel ───────────────────────────────────────────────────────────────

  it('cancels a booking and returns cancelled status', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    const res = await request.post(`/bookings/${id}/cancel`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')
    expect(res.body.data.cancelledAt).not.toBeNull()
  })

  it('returns 409 when cancelling an already-cancelled booking', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    await request.post(`/bookings/${id}/cancel`).set(HEADERS)
    const res = await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    expect(res.status).toBe(409)
  })

  it('returns 404 when cancelling a non-existent booking', async () => {
    const res = await request
      .post(`/bookings/${TEST_NONEXISTENT_ID}/cancel`)
      .set(HEADERS)

    expect(res.status).toBe(404)
  })

  // ── List ─────────────────────────────────────────────────────────────────

  it('lists bookings with pagination metadata', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    await request.post('/bookings').set(JSON_HEADERS).send(
      bookingPayload({ startsAt: SLOT_ADJACENT_START, endsAt: SLOT_ADJACENT_END }),
    )

    const res = await request.get('/bookings?page=1&limit=10').set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination.total).toBe(2)
  })

  it('returns empty list when tenant has no bookings', async () => {
    const res = await request.get('/bookings').set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
  })

  it('filters bookings by status=active, excluding cancelled ones', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id
    await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    await request.post('/bookings').set(JSON_HEADERS).send(
      bookingPayload({ startsAt: SLOT_ADJACENT_START, endsAt: SLOT_ADJACENT_END }),
    )

    const res = await request.get('/bookings?status=active').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].status).toBe('active')
  })

  it('filters bookings by fromDate and toDate', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    await request.post('/bookings').set(JSON_HEADERS).send(
      bookingPayload({ startsAt: SLOT_NEXT_DAY_START, endsAt: SLOT_NEXT_DAY_END }),
    )

    // Only request bookings on 2099-06-01
    const res = await request
      .get('/bookings?fromDate=2099-06-01&toDate=2099-06-02')
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].startsAt).toMatch(/^2099-06-01/)
  })

  // ── Update ────────────────────────────────────────────────────────────────

  it('updates booking notes and returns the updated booking', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    const res = await request
      .patch(`/bookings/${id}`)
      .set(JSON_HEADERS)
      .send({ notes: 'Updated notes' })

    expect(res.status).toBe(200)
    expect(res.body.data.notes).toBe('Updated notes')
  })

  it('updates booking time window', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    const res = await request
      .patch(`/bookings/${id}`)
      .set(JSON_HEADERS)
      .send({ startsAt: SLOT_NEXT_DAY_START, endsAt: SLOT_NEXT_DAY_END })

    expect(res.status).toBe(200)
    expect(res.body.data.startsAt).toMatch(/^2099-06-02/)
  })

  it('returns 400 when endsAt is before startsAt on update', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    const res = await request
      .patch(`/bookings/${id}`)
      .set(JSON_HEADERS)
      .send({ startsAt: SLOT_END, endsAt: SLOT_START })

    expect(res.status).toBe(400)
  })

  it('returns 409 when updating a cancelled booking', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id
    await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    const res = await request
      .patch(`/bookings/${id}`)
      .set(JSON_HEADERS)
      .send({ notes: 'Should not work' })

    expect(res.status).toBe(409)
  })

  it('returns 404 when updating a non-existent booking', async () => {
    const res = await request
      .patch(`/bookings/${TEST_NONEXISTENT_ID}`)
      .set(JSON_HEADERS)
      .send({ notes: 'Ghost booking' })

    expect(res.status).toBe(404)
  })

  // ── Payment status ────────────────────────────────────────────────────────

  it('updates payment status to paid', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id

    const res = await request
      .patch(`/bookings/${id}/payment-status`)
      .set(JSON_HEADERS)
      .send({ paymentStatus: 'paid' })

    expect(res.status).toBe(200)
    expect(res.body.data.paymentStatus).toBe('paid')
  })

  it('returns 409 when updating payment status on a cancelled booking', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id
    await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    const res = await request
      .patch(`/bookings/${id}/payment-status`)
      .set(JSON_HEADERS)
      .send({ paymentStatus: 'paid' })

    expect(res.status).toBe(409)
  })
})
