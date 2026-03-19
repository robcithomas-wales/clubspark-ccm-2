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
  SLOT_START,
  SLOT_END,
  SLOT_OVERLAP_START,
  SLOT_OVERLAP_END,
  SLOT_ADJACENT_START,
  SLOT_ADJACENT_END,
} from './fixtures/index.js'

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

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

describe('Availability — check endpoint', () => {
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

  // ── Available slots ──────────────────────────────────────────────────────

  it('returns isAvailable=true when no bookings exist for the unit', async () => {
    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_START}&endsAt=${SLOT_END}`)
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(true)
    expect(res.body.data.conflicts).toHaveLength(0)
  })

  // ── Conflict detection ───────────────────────────────────────────────────

  it('returns isAvailable=false when an active booking occupies the exact slot', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())

    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_START}&endsAt=${SLOT_END}`)
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(false)
    expect(res.body.data.conflicts).toHaveLength(1)
  })

  it('returns isAvailable=false when a booking partially overlaps the requested slot', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())

    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_OVERLAP_START}&endsAt=${SLOT_OVERLAP_END}`)
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(false)
  })

  it('returns isAvailable=true for an adjacent (non-overlapping) slot', async () => {
    await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())

    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_ADJACENT_START}&endsAt=${SLOT_ADJACENT_END}`)
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(true)
  })

  it('returns isAvailable=true after the conflicting booking is cancelled', async () => {
    const created = await request.post('/bookings').set(JSON_HEADERS).send(bookingPayload())
    const id = created.body.data.id
    await request.post(`/bookings/${id}/cancel`).set(HEADERS)

    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_START}&endsAt=${SLOT_END}`)
      .set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(true)
  })

  // ── Validation ───────────────────────────────────────────────────────────

  it('returns 401 when tenant headers are missing', async () => {
    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_ID}&startsAt=${SLOT_START}&endsAt=${SLOT_END}`)

    expect(res.status).toBe(401)
  })

  it('returns isAvailable=true for an inactive unit (no conflict check needed)', async () => {
    const res = await request
      .get(`/availability/check?bookableUnitId=${TEST_UNIT_INACTIVE_ID}&startsAt=${SLOT_START}&endsAt=${SLOT_END}`)
      .set(HEADERS)

    // Availability check is purely about existing bookings — inactive status is enforced at booking create time
    expect(res.status).toBe(200)
    expect(res.body.data.isAvailable).toBe(true)
  })
})
