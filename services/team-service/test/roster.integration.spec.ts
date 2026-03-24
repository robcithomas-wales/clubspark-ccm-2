import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_TEAM = { name: 'First XI', sport: 'football', season: '2024/25' }
const VALID_MEMBER = { displayName: 'Jamie Smith', email: 'jamie@example.com', position: 'Midfielder' }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Roster — integration', () => {
  let request: ReturnType<typeof supertest>
  let teamId: string

  beforeAll(async () => {
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)

    // Create a team to nest roster under
    const res = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
    teamId = res.body.data.id
  })

  afterEach(async () => {
    await cleanAll()
    // Recreate team after cleanAll
    const res = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
    teamId = res.body.data.id
  })

  afterAll(async () => {
    await cleanAll()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Add member ────────────────────────────────────────────────────────────

  describe('POST /teams/:teamId/roster', () => {
    it('adds a member to the roster and returns 201', async () => {
      const res = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send(VALID_MEMBER)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.displayName).toBe('Jamie Smith')
      expect(res.body.data.isActive).toBe(true)
    })

    it('creates a junior member with guardian details', async () => {
      const res = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send({
          displayName: 'Young Player',
          isJunior: true,
          guardianName: 'Parent Smith',
          guardianEmail: 'parent@example.com',
          guardianPhone: '07700900000',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.isJunior).toBe(true)
      expect(res.body.data.guardianName).toBe('Parent Smith')
    })

    it('returns 400 when displayName is missing', async () => {
      const res = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send({ email: 'no-name@example.com' })
      expect(res.status).toBe(400)
    })

    it('returns 401 when auth headers are missing', async () => {
      const res = await request.post(`/teams/${teamId}/roster`).send(VALID_MEMBER)
      expect(res.status).toBe(401)
    })
  })

  // ── List ──────────────────────────────────────────────────────────────────

  describe('GET /teams/:teamId/roster', () => {
    it('returns an empty list initially', async () => {
      const res = await request.get(`/teams/${teamId}/roster`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('lists roster members for the team', async () => {
      await request.post(`/teams/${teamId}/roster`).set(JSON_HEADERS).send(VALID_MEMBER)
      await request.post(`/teams/${teamId}/roster`).set(JSON_HEADERS).send({ displayName: 'Alex Jones' })

      const res = await request.get(`/teams/${teamId}/roster`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })
  })

  // ── Get by ID ─────────────────────────────────────────────────────────────

  describe('GET /teams/:teamId/roster/:id', () => {
    it('retrieves a member by id', async () => {
      const created = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send(VALID_MEMBER)
      const id = created.body.data.id

      const res = await request.get(`/teams/${teamId}/roster/${id}`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data.displayName).toBe('Jamie Smith')
    })

    it('returns 404 for a non-existent member', async () => {
      const res = await request.get(`/teams/${teamId}/roster/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PATCH /teams/:teamId/roster/:id', () => {
    it('updates member position and shirt number', async () => {
      const created = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send(VALID_MEMBER)
      const id = created.body.data.id

      const res = await request
        .patch(`/teams/${teamId}/roster/${id}`)
        .set(JSON_HEADERS)
        .send({ position: 'Goalkeeper', shirtNumber: 1 })

      expect(res.status).toBe(200)
      expect(res.body.data.position).toBe('Goalkeeper')
      expect(res.body.data.shirtNumber).toBe(1)
    })
  })

  // ── Remove ────────────────────────────────────────────────────────────────

  describe('DELETE /teams/:teamId/roster/:id', () => {
    it('soft-deletes a member (sets isActive: false)', async () => {
      const created = await request
        .post(`/teams/${teamId}/roster`)
        .set(JSON_HEADERS)
        .send(VALID_MEMBER)
      const id = created.body.data.id

      const del = await request.delete(`/teams/${teamId}/roster/${id}`).set(HEADERS)
      expect(del.status).toBe(200)

      // Should no longer appear in active list
      const list = await request.get(`/teams/${teamId}/roster`).set(HEADERS)
      expect(list.body.data).toHaveLength(0)
    })
  })
})
