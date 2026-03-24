import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_TEAM = { name: 'First XI', sport: 'football', season: '2024/25', defaultMatchFee: 10 }
const VALID_FIXTURE = {
  opponent: 'Town FC',
  kickoffAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  homeAway: 'home',
  venue: 'Home Ground',
  durationMinutes: 90,
  matchType: 'league',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Fixtures & Availability — integration', () => {
  let request: ReturnType<typeof supertest>
  let teamId: string
  let fixtureId: string
  let memberId: string

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

  async function createTeamAndFixture() {
    const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
    teamId = teamRes.body.data.id

    const fixRes = await request
      .post(`/teams/${teamId}/fixtures`)
      .set(JSON_HEADERS)
      .send(VALID_FIXTURE)
    fixtureId = fixRes.body.data.id

    const memberRes = await request
      .post(`/teams/${teamId}/roster`)
      .set(JSON_HEADERS)
      .send({ displayName: 'Jamie Smith' })
    memberId = memberRes.body.data.id
  }

  // ── Fixtures CRUD ─────────────────────────────────────────────────────────

  describe('POST /teams/:teamId/fixtures', () => {
    it('creates a fixture with status scheduled', async () => {
      const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      teamId = teamRes.body.data.id

      const res = await request
        .post(`/teams/${teamId}/fixtures`)
        .set(JSON_HEADERS)
        .send(VALID_FIXTURE)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.opponent).toBe('Town FC')
      expect(res.body.data.status).toBe('scheduled')
    })

    it('returns 400 when opponent is missing', async () => {
      const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)

      const res = await request
        .post(`/teams/${teamRes.body.data.id}/fixtures`)
        .set(JSON_HEADERS)
        .send({ kickoffAt: VALID_FIXTURE.kickoffAt })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /teams/:teamId/fixtures', () => {
    it('lists fixtures for the team', async () => {
      const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      teamId = teamRes.body.data.id

      await request.post(`/teams/${teamId}/fixtures`).set(JSON_HEADERS).send(VALID_FIXTURE)
      await request.post(`/teams/${teamId}/fixtures`).set(JSON_HEADERS).send({ ...VALID_FIXTURE, opponent: 'City FC' })

      const res = await request.get(`/teams/${teamId}/fixtures`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })
  })

  describe('GET /teams/:teamId/fixtures/:id', () => {
    it('returns fixture with nested availability and selection', async () => {
      await createTeamAndFixture()

      const res = await request.get(`/teams/${teamId}/fixtures/${fixtureId}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.availability).toBeDefined()
      expect(res.body.data.selections).toBeDefined()
    })

    it('returns 404 for a non-existent fixture', async () => {
      const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      const res = await request
        .get(`/teams/${teamRes.body.data.id}/fixtures/${TEST_NONEXISTENT_ID}`)
        .set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /teams/:teamId/fixtures/:id/cancel', () => {
    it('cancels a fixture', async () => {
      const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
      teamId = teamRes.body.data.id

      const fixRes = await request
        .post(`/teams/${teamId}/fixtures`)
        .set(JSON_HEADERS)
        .send(VALID_FIXTURE)
      fixtureId = fixRes.body.data.id

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/cancel`)
        .set(JSON_HEADERS)
        .send({ reason: 'Bad weather' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('cancelled')
    })
  })

  // ── Availability ──────────────────────────────────────────────────────────

  describe('Availability', () => {
    it('allows a member to respond available', async () => {
      await createTeamAndFixture()

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/availability/${memberId}`)
        .set(JSON_HEADERS)
        .send({ response: 'available', notes: 'Ready to play' })

      expect(res.status).toBe(200)
      expect(res.body.data.response).toBe('available')
    })

    it('bulk-requests availability for all active members', async () => {
      await createTeamAndFixture()

      // Add a second member
      await request.post(`/teams/${teamId}/roster`).set(JSON_HEADERS).send({ displayName: 'Alex Jones' })

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/availability/request`)
        .set(JSON_HEADERS)
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.created).toBeGreaterThanOrEqual(2)
    })

    it('returns availability summary on GET', async () => {
      await createTeamAndFixture()

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/availability/${memberId}`)
        .set(JSON_HEADERS)
        .send({ response: 'available' })

      const res = await request
        .get(`/teams/${teamId}/fixtures/${fixtureId}/availability`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.summary.available).toBe(1)
    })

    it('returns 401 without auth headers', async () => {
      await createTeamAndFixture()
      const res = await request.get(`/teams/${teamId}/fixtures/${fixtureId}/availability`)
      expect(res.status).toBe(401)
    })
  })
})
