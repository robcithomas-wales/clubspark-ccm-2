import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, cleanBookingSeries, teardownFixtures, checkDbAvailable } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
} from './fixtures/index.js'

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

function seriesPayload(overrides: Record<string, unknown> = {}) {
  return {
    venueId: TEST_VENUE_ID,
    resourceId: TEST_RESOURCE_ID,
    bookableUnitId: TEST_UNIT_ID,
    startsAt: '2099-07-01T10:00:00Z',
    endsAt: '2099-07-01T11:00:00Z',
    rrule: 'FREQ=WEEKLY;COUNT=4',
    ...overrides,
  }
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Booking Series — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await cleanBookingSeries()
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Create ────────────────────────────────────────────────────────────────

  it('creates a series and expands 4 weekly occurrences', async () => {
    const res = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload())

    expect(res.status).toBe(201)
    expect(res.body.data.series.id).toBeDefined()
    expect(res.body.data.bookings).toHaveLength(4)
    expect(res.body.data.bookings[0].status).toBe('active')
  })

  it('stores minSessions and maxSessions on the series', async () => {
    const res = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload({ minSessions: 2, maxSessions: 4 }))

    expect(res.status).toBe(201)
    expect(res.body.data.series.minSessions).toBe(2)
    expect(res.body.data.series.maxSessions).toBe(4)
  })

  it('creates a series without minSessions/maxSessions (both null)', async () => {
    const res = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload())

    expect(res.status).toBe(201)
    expect(res.body.data.series.minSessions).toBeNull()
    expect(res.body.data.series.maxSessions).toBeNull()
  })

  it('returns 400 when rrule is missing', async () => {
    const { rrule: _, ...payload } = seriesPayload() as any
    const res = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(payload)

    expect(res.status).toBe(400)
  })

  it('returns 409 SERIES_CONFLICT when occurrences overlap an existing booking', async () => {
    // Create the first series
    await request.post('/booking-series').set(JSON_HEADERS).send(seriesPayload())

    // Create a second series with the same slot — should conflict
    const res = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload())

    expect(res.status).toBe(409)
  })

  // ── List & fetch ──────────────────────────────────────────────────────────

  it('lists all series for the tenant', async () => {
    await request.post('/booking-series').set(JSON_HEADERS).send(seriesPayload())

    const res = await request.get('/booking-series').set(HEADERS)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('fetches a series by id with its bookings', async () => {
    const created = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload())
    const seriesId = created.body.data.series.id

    const res = await request.get(`/booking-series/${seriesId}`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(seriesId)
    expect(Array.isArray(res.body.data.bookings)).toBe(true)
    expect(res.body.data.bookings).toHaveLength(4)
  })

  it('returns 404 for a non-existent series', async () => {
    const res = await request
      .get('/booking-series/10000000-0000-4000-8000-ffffffffffff')
      .set(HEADERS)

    expect(res.status).toBe(404)
  })

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('cancels all bookings in a series', async () => {
    const created = await request
      .post('/booking-series')
      .set(JSON_HEADERS)
      .send(seriesPayload())
    const seriesId = created.body.data.series.id

    const res = await request
      .post(`/booking-series/${seriesId}/cancel`)
      .set(JSON_HEADERS)
      .send({ mode: 'all' })

    expect(res.status).toBe(200)

    const fetched = await request.get(`/booking-series/${seriesId}`).set(HEADERS)
    expect(fetched.body.data.status).toBe('cancelled')
    expect(fetched.body.data.bookings.every((b: any) => b.status === 'cancelled')).toBe(true)
  })
})
