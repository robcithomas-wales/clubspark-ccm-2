import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_TEAM = {
  name: 'First XI',
  sport: 'football',
  season: '2024/25',
  ageGroup: 'senior',
  gender: 'mixed',
  defaultMatchFee: 10,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Teams — integration', () => {
  let request: ReturnType<typeof supertest>

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

  // ── Create ────────────────────────────────────────────────────────────────

  describe('POST /teams', () => {
    it('creates a team and returns 201 with an id', async () => {
      const res = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('First XI')
      expect(res.body.data.sport).toBe('football')
      expect(res.body.data.isActive).toBe(true)
    })

    it('returns 400 when name is missing', async () => {
      const res = await request.post('/teams').set(JSON_HEADERS).send({ sport: 'football' })
      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.post('/teams').send(VALID_TEAM)
      expect(res.status).toBe(401)
    })
  })

  // ── List ──────────────────────────────────────────────────────────────────

  describe('GET /teams', () => {
    it('returns an empty list when no teams exist', async () => {
      const res = await request.get('/teams').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('lists teams for the tenant', async () => {
      await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      await request.post('/teams').set(JSON_HEADERS).send({ ...VALID_TEAM, name: 'U18s' })

      const res = await request.get('/teams').set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })
  })

  // ── Get by ID ─────────────────────────────────────────────────────────────

  describe('GET /teams/:id', () => {
    it('retrieves a team by id', async () => {
      const created = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      const id = created.body.data.id

      const res = await request.get(`/teams/${id}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.name).toBe('First XI')
    })

    it('returns 404 for a non-existent team', async () => {
      const res = await request.get(`/teams/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PATCH /teams/:id', () => {
    it('updates team name and fee', async () => {
      const created = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      const id = created.body.data.id

      const res = await request
        .patch(`/teams/${id}`)
        .set(JSON_HEADERS)
        .send({ name: 'Reserves', defaultMatchFee: 5 })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Reserves')
    })

    it('returns 404 for a non-existent team', async () => {
      const res = await request
        .patch(`/teams/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ name: 'Ghost' })
      expect(res.status).toBe(404)
    })
  })
})
