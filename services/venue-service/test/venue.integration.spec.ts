import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, seedFixtures, teardownFixtures } from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_NONEXISTENT_ID,
} from './fixtures/index.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
  'x-organisation-id': TEST_ORG_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('Venue service — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Resources
  // ══════════════════════════════════════════════════════════════════════════

  describe('Resources', () => {
    it('lists resources for the tenant', async () => {
      const res = await request.get('/resources').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters resources by venueId', async () => {
      const res = await request
        .get(`/resources?venueId=${TEST_VENUE_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((r: any) => r.venueId === TEST_VENUE_ID)).toBe(true)
    })

    it('filters resources by isActive', async () => {
      const res = await request
        .get('/resources?isActive=true')
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((r: any) => r.isActive === true)).toBe(true)
    })

    it('gets a resource by id', async () => {
      const res = await request
        .get(`/resources/${TEST_RESOURCE_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(TEST_RESOURCE_ID)
      expect(res.body.data.name).toBe('Test Court 1')
    })

    it('returns 404 for a non-existent resource', async () => {
      const res = await request
        .get(`/resources/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('creates a resource with all attributes', async () => {
      const res = await request
        .post('/resources')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          name: 'Court A',
          resourceType: 'court',
          sport: 'tennis',
          surface: 'hard',
          isIndoor: true,
          hasLighting: true,
          bookingPurposes: ['match', 'training'],
          description: 'A nice court',
          colour: '#00cc88',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.sport).toBe('tennis')
      expect(res.body.data.surface).toBe('hard')
      expect(res.body.data.isIndoor).toBe(true)
      expect(res.body.data.hasLighting).toBe(true)
      expect(res.body.data.bookingPurposes).toEqual(['match', 'training'])
    })

    it('creates a resource with minimal fields', async () => {
      const res = await request
        .post('/resources')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, name: 'Pitch B', resourceType: 'pitch' })

      expect(res.status).toBe(201)
      expect(res.body.data.isActive).toBe(true)
      expect(res.body.data.bookingPurposes).toEqual([])
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/resources')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, resourceType: 'court' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when venueId is missing', async () => {
      const res = await request
        .post('/resources')
        .set(JSON_HEADERS)
        .send({ name: 'Court X', resourceType: 'court' })

      expect(res.status).toBe(400)
    })

    it('updates a resource', async () => {
      const created = await request
        .post('/resources')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, name: 'Court Update', resourceType: 'court' })

      const res = await request
        .patch(`/resources/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ hasLighting: true, surface: 'grass', isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data.hasLighting).toBe(true)
      expect(res.body.data.surface).toBe('grass')
      expect(res.body.data.isActive).toBe(false)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.get('/resources')
      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Resource Groups
  // ══════════════════════════════════════════════════════════════════════════

  describe('Resource Groups', () => {
    let groupId: string

    it('creates a resource group and returns 201', async () => {
      const res = await request
        .post('/resource-groups')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          name: 'Tennis Courts',
          sport: 'tennis',
          colour: '#0055ff',
          sortOrder: 1,
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Tennis Courts')
      expect(res.body.data.sport).toBe('tennis')
      groupId = res.body.data.id
    })

    it('lists groups for the tenant', async () => {
      const res = await request.get('/resource-groups').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters groups by venueId', async () => {
      const res = await request
        .get(`/resource-groups?venueId=${TEST_VENUE_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((g: any) => g.venueId === TEST_VENUE_ID)).toBe(true)
    })

    it('gets a group by id including its resources', async () => {
      const res = await request
        .get(`/resource-groups/${groupId}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(groupId)
      expect(Array.isArray(res.body.data.resources)).toBe(true)
    })

    it('returns 404 for a non-existent group', async () => {
      const res = await request
        .get(`/resource-groups/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a group', async () => {
      const res = await request
        .patch(`/resource-groups/${groupId}`)
        .set(JSON_HEADERS)
        .send({ name: 'All Tennis Courts', colour: '#ff0000' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('All Tennis Courts')
      expect(res.body.data.colour).toBe('#ff0000')
    })

    it('assigns a resource to a group', async () => {
      const res = await request
        .patch(`/resources/${TEST_RESOURCE_ID}`)
        .set(JSON_HEADERS)
        .send({ groupId })

      expect(res.status).toBe(200)
      expect(res.body.data.groupId).toBe(groupId)
    })

    it('filters resources by groupId', async () => {
      const res = await request
        .get(`/resources?groupId=${groupId}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.every((r: any) => r.groupId === groupId)).toBe(true)
    })

    it('returns 400 when venueId is missing', async () => {
      const res = await request
        .post('/resource-groups')
        .set(JSON_HEADERS)
        .send({ name: 'No Venue' })

      expect(res.status).toBe(400)
    })

    it('deletes a group and returns 204', async () => {
      // Unassign resource from group first to avoid FK constraint
      await request
        .patch(`/resources/${TEST_RESOURCE_ID}`)
        .set(JSON_HEADERS)
        .send({ groupId: null })

      const res = await request
        .delete(`/resource-groups/${groupId}`)
        .set(HEADERS)

      expect(res.status).toBe(204)
    })

    it('returns 404 when deleting a non-existent group', async () => {
      const res = await request
        .delete(`/resource-groups/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Availability Configs
  // ══════════════════════════════════════════════════════════════════════════

  describe('Availability Configs', () => {
    let configId: string

    it('creates a venue-level catch-all config', async () => {
      const res = await request
        .post('/availability-configs')
        .set(JSON_HEADERS)
        .send({
          scopeType: 'venue',
          scopeId: TEST_VENUE_ID,
          opensAt: '08:00',
          closesAt: '22:00',
          slotDurationMinutes: 60,
          bookingIntervalMinutes: 60,
          newDayReleaseTime: '08:00',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.scopeType).toBe('venue')
      expect(res.body.data.opensAt).toBe('08:00')
      configId = res.body.data.id
    })

    it('creates a resource-level day-specific config (Monday)', async () => {
      const res = await request
        .post('/availability-configs')
        .set(JSON_HEADERS)
        .send({
          scopeType: 'resource',
          scopeId: TEST_RESOURCE_ID,
          dayOfWeek: 1,
          opensAt: '09:00',
          closesAt: '20:00',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.dayOfWeek).toBe(1)
      expect(res.body.data.scopeType).toBe('resource')
    })

    it('lists configs filtered by scopeType and scopeId', async () => {
      const res = await request
        .get(`/availability-configs?scopeType=venue&scopeId=${TEST_VENUE_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.every((c: any) => c.scopeType === 'venue')).toBe(true)
    })

    it('gets a config by id', async () => {
      const res = await request
        .get(`/availability-configs/${configId}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(configId)
    })

    it('returns 404 for a non-existent config', async () => {
      const res = await request
        .get(`/availability-configs/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a config', async () => {
      const res = await request
        .patch(`/availability-configs/${configId}`)
        .set(JSON_HEADERS)
        .send({ closesAt: '23:00', slotDurationMinutes: 30 })

      expect(res.status).toBe(200)
      expect(res.body.data.closesAt).toBe('23:00')
      expect(res.body.data.slotDurationMinutes).toBe(30)
    })

    it('resolves effective config — resource overrides venue for Monday', async () => {
      const res = await request
        .get(
          `/availability-configs/effective?resourceId=${TEST_RESOURCE_ID}&venueId=${TEST_VENUE_ID}&dayOfWeek=1`,
        )
        .set(HEADERS)

      expect(res.status).toBe(200)
      // opensAt should come from the resource-level Monday config (09:00)
      // slotDurationMinutes should fall through to the venue config (30 after update)
      expect(res.body.data.opensAt).toBe('09:00')
      expect(res.body.data.closesAt).toBe('20:00')
      expect(res.body.data.slotDurationMinutes).toBe(30)
    })

    it('resolves effective config — falls through to venue on a day with no resource config', async () => {
      const res = await request
        .get(
          `/availability-configs/effective?resourceId=${TEST_RESOURCE_ID}&venueId=${TEST_VENUE_ID}&dayOfWeek=3`,
        )
        .set(HEADERS)

      expect(res.status).toBe(200)
      // No resource-level config for Wednesday — should come from venue catch-all
      expect(res.body.data.opensAt).toBe('08:00')
    })

    it('returns 400 for invalid scopeType', async () => {
      const res = await request
        .post('/availability-configs')
        .set(JSON_HEADERS)
        .send({ scopeType: 'invalid', scopeId: TEST_VENUE_ID, opensAt: '08:00' })

      expect(res.status).toBe(400)
    })

    it('deletes a config and returns 204', async () => {
      const res = await request
        .delete(`/availability-configs/${configId}`)
        .set(HEADERS)

      expect(res.status).toBe(204)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Venues
  // ══════════════════════════════════════════════════════════════════════════

  describe('Venues', () => {
    it('lists venues for the tenant', async () => {
      const res = await request.get('/venues').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('includes the seeded test venue', async () => {
      const res = await request.get('/venues').set(HEADERS)

      const match = res.body.data.find((v: any) => v.id === TEST_VENUE_ID)
      expect(match).toBeDefined()
      expect(match.name).toBe('Test Venue')
    })

    it('returns 401 when tenant headers are missing', async () => {
      const res = await request.get('/venues')
      expect(res.status).toBe(401)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Venue Settings
  // ══════════════════════════════════════════════════════════════════════════

  describe('Venue Settings', () => {
    it('returns default empty settings when none have been saved', async () => {
      const res = await request
        .get(`/venues/${TEST_VENUE_ID}/settings`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      // Either a settings record with the venueId, or {venueId} fallback
      expect(res.body.data.venueId).toBe(TEST_VENUE_ID)
    })

    it('upserts venue settings and returns the saved record', async () => {
      const res = await request
        .put(`/venues/${TEST_VENUE_ID}/settings`)
        .set(JSON_HEADERS)
        .send({
          openBookings: true,
          addOnsEnabled: true,
          pendingApprovals: true,
          splitPayments: false,
          publicBookingView: 'availability',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.venueId).toBe(TEST_VENUE_ID)
      expect(res.body.data.openBookings).toBe(true)
      expect(res.body.data.pendingApprovals).toBe(true)
      expect(res.body.data.publicBookingView).toBe('availability')
    })

    it('reads back updated settings after upsert', async () => {
      await request
        .put(`/venues/${TEST_VENUE_ID}/settings`)
        .set(JSON_HEADERS)
        .send({ openBookings: false, addOnsEnabled: false })

      const res = await request
        .get(`/venues/${TEST_VENUE_ID}/settings`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.openBookings).toBe(false)
      expect(res.body.data.addOnsEnabled).toBe(false)
    })

    it('accepts a partial update (only fields provided are changed)', async () => {
      await request
        .put(`/venues/${TEST_VENUE_ID}/settings`)
        .set(JSON_HEADERS)
        .send({ openBookings: true, splitPayments: true })

      const res = await request
        .put(`/venues/${TEST_VENUE_ID}/settings`)
        .set(JSON_HEADERS)
        .send({ splitPayments: false })

      expect(res.status).toBe(200)
      expect(res.body.data.splitPayments).toBe(false)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Bookable Units
  // ══════════════════════════════════════════════════════════════════════════

  describe('Bookable Units', () => {
    let unitId: string

    it('creates a bookable unit and returns 201', async () => {
      const res = await request
        .post('/bookable-units')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          resourceId: TEST_RESOURCE_ID,
          name: 'Full Court',
          unitType: 'full',
          capacity: 4,
          sortOrder: 1,
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Full Court')
      expect(res.body.data.isActive).toBe(true)
      expect(res.body.data.isOptionalExtra).toBe(false)
      unitId = res.body.data.id
    })

    it('creates an optional-extra unit', async () => {
      const res = await request
        .post('/bookable-units')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          resourceId: TEST_RESOURCE_ID,
          name: 'Half Court A',
          unitType: 'half',
          isOptionalExtra: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.data.isOptionalExtra).toBe(true)
    })

    it('lists bookable units for the tenant', async () => {
      const res = await request.get('/bookable-units').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('lists units for a specific venue', async () => {
      const res = await request
        .get(`/venues/${TEST_VENUE_ID}/units`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.every((u: any) => u.venueId === TEST_VENUE_ID)).toBe(true)
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request
        .post('/bookable-units')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, name: 'No Type' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when resourceId is missing', async () => {
      const res = await request
        .post('/bookable-units')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, name: 'No Resource', unitType: 'full' })

      expect(res.status).toBe(400)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Product Add-Ons
  // ══════════════════════════════════════════════════════════════════════════

  describe('Product Add-Ons', () => {
    let addOnId: string

    it('creates an add-on and returns 201', async () => {
      const res = await request
        .post('/add-ons')
        .set(JSON_HEADERS)
        .send({
          name: 'Ball hire',
          code: 'BALL-HIRE',
          category: 'equipment',
          pricingType: 'fixed',
          price: 3.5,
          currency: 'GBP',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Ball hire')
      expect(res.body.data.status).toBe('active')
      addOnId = res.body.data.id
    })

    it('creates an add-on without tenantId in body (regression — UUID v4 rejection)', async () => {
      // tenantId must come from the header, NOT the body.
      // This was a bug where @IsUUID() on a tenantId body field rejected demo tenant IDs.
      const res = await request
        .post('/add-ons')
        .set(JSON_HEADERS)
        .send({
          name: 'Towel hire',
          code: 'TOWEL-HIRE',
          category: 'service',
          pricingType: 'fixed',
          price: 1.0,
        })

      expect(res.status).toBe(201)
      expect(res.body.data.tenantId).toBe(TEST_TENANT_ID)
    })

    it('lists add-ons for the tenant', async () => {
      const res = await request.get('/add-ons').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('gets an add-on by id', async () => {
      const res = await request.get(`/add-ons/${addOnId}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(addOnId)
      expect(res.body.data.code).toBe('BALL-HIRE')
    })

    it('returns 404 for a non-existent add-on', async () => {
      const res = await request.get(`/add-ons/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })

    it('returns 400 when name is missing', async () => {
      const res = await request
        .post('/add-ons')
        .set(JSON_HEADERS)
        .send({ code: 'NO-NAME', category: 'equipment' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when category is invalid', async () => {
      const res = await request
        .post('/add-ons')
        .set(JSON_HEADERS)
        .send({ name: 'Bad', code: 'BAD', category: 'not_a_category' })

      expect(res.status).toBe(400)
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Blackout Dates
  // ══════════════════════════════════════════════════════════════════════════

  describe('Blackout Dates', () => {
    let blackoutId: string

    it('creates a venue-level blackout and returns 201', async () => {
      const res = await request
        .post('/blackout-dates')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          name: 'Christmas closure',
          startDate: '2099-12-24',
          endDate: '2099-12-26',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Christmas closure')
      blackoutId = res.body.data.id
    })

    it('creates a resource-level blackout', async () => {
      const res = await request
        .post('/blackout-dates')
        .set(JSON_HEADERS)
        .send({
          venueId: TEST_VENUE_ID,
          resourceId: TEST_RESOURCE_ID,
          name: 'Court maintenance',
          startDate: '2099-11-01',
          endDate: '2099-11-02',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.resourceId).toBe(TEST_RESOURCE_ID)
    })

    it('lists blackout dates for the tenant', async () => {
      const res = await request.get('/blackout-dates').set(HEADERS)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('gets a blackout by id', async () => {
      const res = await request.get(`/blackout-dates/${blackoutId}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(blackoutId)
    })

    it('returns 404 for a non-existent blackout', async () => {
      const res = await request
        .get(`/blackout-dates/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('updates a blackout date', async () => {
      const res = await request
        .patch(`/blackout-dates/${blackoutId}`)
        .set(JSON_HEADERS)
        .send({ name: 'Extended Christmas closure', endDate: '2099-12-27' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Extended Christmas closure')
      expect(res.body.data.endDate).toMatch(/2099-12-27/)
    })

    it('deletes a blackout and returns 204', async () => {
      const res = await request
        .delete(`/blackout-dates/${blackoutId}`)
        .set(HEADERS)

      expect(res.status).toBe(204)
    })

    it('returns 404 when deleting a non-existent blackout', async () => {
      const res = await request
        .delete(`/blackout-dates/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)

      expect(res.status).toBe(404)
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request
        .post('/blackout-dates')
        .set(JSON_HEADERS)
        .send({ venueId: TEST_VENUE_ID, name: 'No dates' })

      expect(res.status).toBe(400)
    })
  })
})
