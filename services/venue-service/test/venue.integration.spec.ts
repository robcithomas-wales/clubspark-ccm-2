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

    it('returns 400 when auth headers are missing', async () => {
      const res = await request.get('/resources')
      expect(res.status).toBe(400)
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
})
