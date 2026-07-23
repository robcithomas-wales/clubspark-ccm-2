import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, seedFixtures, teardownFixtures, cleanSponsors } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = {
  'x-tenant-id': TEST_TENANT_ID,
}

const JSON_HEADERS = {
  ...HEADERS,
  'content-type': 'application/json',
}

const SPONSOR_PAYLOAD = {
  name: 'Acme Sports',
  logoUrl: 'https://example.com/acme-logo.png',
  websiteUrl: 'https://acme.example.com',
  displayOrder: 1,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Sponsors — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanSponsors)
  afterAll(async () => { await teardownFixtures(); await prisma.$disconnect(); await closeApp() })

  describe('POST /sponsors', () => {
    it('creates a sponsor and returns it', async () => {
      const res = await request.post('/sponsors').set(JSON_HEADERS).send(SPONSOR_PAYLOAD)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Acme Sports')
      expect(res.body.data.logoUrl).toBe('https://example.com/acme-logo.png')
      expect(res.body.data.isActive).toBe(true)
    })

    it('returns 400 when logoUrl is missing', async () => {
      const res = await request
        .post('/sponsors')
        .set(JSON_HEADERS)
        .send({ name: 'No Logo Corp' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/sponsors').send(SPONSOR_PAYLOAD)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /sponsors', () => {
    it('lists active sponsors for the tenant', async () => {
      await request.post('/sponsors').set(JSON_HEADERS).send(SPONSOR_PAYLOAD)

      const res = await request.get('/sponsors').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.data.every((s: any) => s.isActive === true)).toBe(true)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/sponsors')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /sponsors/public', () => {
    it('returns active sponsors without requiring auth header', async () => {
      await request.post('/sponsors').set(JSON_HEADERS).send(SPONSOR_PAYLOAD)

      const res = await request.get(`/sponsors/public?tenantId=${TEST_TENANT_ID}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('PATCH /sponsors/:id', () => {
    it('updates sponsor fields', async () => {
      const created = await request.post('/sponsors').set(JSON_HEADERS).send(SPONSOR_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .patch(`/sponsors/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Acme Sports Updated', displayOrder: 2 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Acme Sports Updated')
      expect(res.body.data.displayOrder).toBe(2)
    })

    it('returns 404 for a non-existent sponsor', async () => {
      const res = await request
        .patch(`/sponsors/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost Sponsor' })

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request
        .patch(`/sponsors/${TEST_NONEXISTENT_ID}`)
        .send({ name: 'Ghost' })

      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /sponsors/:id', () => {
    it('soft-deletes a sponsor (sets isActive=false)', async () => {
      const created = await request.post('/sponsors').set(JSON_HEADERS).send(SPONSOR_PAYLOAD)
      const id = created.body.data.id

      const del = await request.delete(`/sponsors/${id}`).set(HEADERS)
      expect(del.status).toBe(200)
      expect(del.body.data.success).toBe(true)

      // Should no longer appear in the active list
      const list = await request.get('/sponsors').set(HEADERS)
      expect(list.body.data.find((s: any) => s.id === id)).toBeUndefined()
    })

    it('returns 404 for a non-existent sponsor', async () => {
      const res = await request.delete(`/sponsors/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request.delete(`/sponsors/${TEST_NONEXISTENT_ID}`)
      expect(res.status).toBe(401)
    })
  })
})
