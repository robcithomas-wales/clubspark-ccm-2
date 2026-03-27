import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const PERSON_A = '62000000-0000-4000-8000-000000000001'
const PERSON_B = '62000000-0000-4000-8000-000000000002'
const PERSON_C = '62000000-0000-4000-8000-000000000003'

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Rankings — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(async () => {
    await prisma.rankingMatchEvent.deleteMany({
      where: { config: { tenantId: TEST_TENANT_ID } },
    })
    await prisma.rankingEntry.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    })
    await prisma.rankingConfig.deleteMany({
      where: { tenantId: TEST_TENANT_ID },
    })
    await cleanCompetitions()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await closeApp()
  })

  // ── Config CRUD ────────────────────────────────────────────────────────────

  describe('POST /rankings/configs', () => {
    it('creates an ELO config for tennis', async () => {
      const res = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO',
      })
      expect(res.status).toBe(201)
      expect(res.body.data.sport).toBe('tennis')
      expect(res.body.data.algorithm).toBe('ELO')
      expect(res.body.data.scope).toBe('ALL_TIME')
    })

    it('creates a POINTS_TABLE config for football', async () => {
      const res = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'football', scope: 'SEASON', algorithm: 'POINTS_TABLE', season: '2026 Spring', pointsPerWin: 3,
      })
      expect(res.status).toBe(201)
      expect(res.body.data.algorithm).toBe('POINTS_TABLE')
      expect(res.body.data.season).toBe('2026 Spring')
      expect(res.body.data.pointsPerWin).toBe(3)
    })

    it('returns 400 when sport is missing', async () => {
      const res = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        scope: 'ALL_TIME', algorithm: 'ELO',
      })
      expect(res.status).toBe(400)
    })

    it('returns 401 without auth headers', async () => {
      const res = await request.post('/rankings/configs').send({ sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO' })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /rankings/configs', () => {
    it('lists configs for tenant', async () => {
      await request.post('/rankings/configs').set(JSON_HEADERS).send({ sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO' })
      await request.post('/rankings/configs').set(JSON_HEADERS).send({ sport: 'football', scope: 'SEASON', algorithm: 'POINTS_TABLE', season: '2026' })

      const res = await request.get('/rankings/configs').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('filters by sport', async () => {
      await request.post('/rankings/configs').set(JSON_HEADERS).send({ sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO' })
      await request.post('/rankings/configs').set(JSON_HEADERS).send({ sport: 'football', scope: 'SEASON', algorithm: 'POINTS_TABLE', season: '2026' })

      const res = await request.get('/rankings/configs?sport=tennis').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((c: any) => c.sport === 'tennis')).toBe(true)
    })
  })

  describe('PATCH /rankings/configs/:id', () => {
    it('updates pointsPerWin', async () => {
      const created = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'football', scope: 'ALL_TIME', algorithm: 'POINTS_TABLE',
      })
      const id = created.body.data.id

      const res = await request.patch(`/rankings/configs/${id}`).set(JSON_HEADERS).send({ pointsPerWin: 2 })
      expect(res.status).toBe(200)
      expect(res.body.data.pointsPerWin).toBe(2)
    })

    it('returns 404 for non-existent config', async () => {
      const res = await request.patch(`/rankings/configs/${TEST_NONEXISTENT_ID}`).set(JSON_HEADERS).send({ pointsPerWin: 2 })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /rankings/configs/:id', () => {
    it('deletes a config and cascades entries', async () => {
      const created = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO',
      })
      const id = created.body.data.id

      const del = await request.delete(`/rankings/configs/${id}`).set(HEADERS)
      expect(del.status).toBe(204)

      const get = await request.get(`/rankings/configs/${id}`).set(HEADERS)
      expect(get.status).toBe(404)
    })
  })

  // ── Leaderboard ────────────────────────────────────────────────────────────

  describe('GET /rankings/:configId', () => {
    it('returns empty leaderboard for new config', async () => {
      const created = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO',
      })
      const configId = created.body.data.id

      const res = await request.get(`/rankings/${configId}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.total).toBe(0)
    })

    it('returns 404 for non-existent config', async () => {
      const res = await request.get(`/rankings/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  // ── End-to-end: result verified → rankings updated ─────────────────────────

  describe('Rankings auto-update on result verification', () => {
    it('updates ELO ratings after a verified tennis result', async () => {
      // Create ELO ranking config for tennis
      const configRes = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO',
      })
      const configId = configRes.body.data.id

      // Create a tennis competition with 2 entries, generate draw, verify result
      const compRes = await request.post('/competitions').set(JSON_HEADERS).send({
        name: 'Rankings Test Tennis', sport: 'tennis', format: 'KNOCKOUT', entryType: 'INDIVIDUAL',
      })
      expect(compRes.status).toBe(201)
      const compId = compRes.body.data.id
      const divId = compRes.body.data.divisions[0].id

      const entryA = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Alice', personId: PERSON_A, divisionId: divId })
      const entryB = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Bob', personId: PERSON_B, divisionId: divId })
      await request.patch(`/competitions/${compId}/entries/${entryA.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED' })
      await request.patch(`/competitions/${compId}/entries/${entryB.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED' })

      await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)

      // Find the match
      const matchesRes = await request.get(`/competitions/${compId}/matches`).set(HEADERS)
      const match = matchesRes.body.data[0]

      // Submit a verified result — Alice wins
      await request.post(`/competitions/${compId}/matches/${match.id}/result`).set(JSON_HEADERS).send({
        winnerId: entryA.body.data.id,
        homePoints: 6, awayPoints: 3,
        score: { home: 6, away: 3 },
        adminVerify: true,
      })

      // Check rankings updated
      const leaderboard = await request.get(`/rankings/${configId}`).set(HEADERS)
      expect(leaderboard.status).toBe(200)
      expect(leaderboard.body.data).toHaveLength(2)

      const alice = leaderboard.body.data.find((e: any) => e.displayName === 'Alice')
      const bob = leaderboard.body.data.find((e: any) => e.displayName === 'Bob')

      expect(alice).toBeDefined()
      expect(bob).toBeDefined()
      // Alice won so her ELO should be above 1000
      expect(alice.eloRating).toBeGreaterThan(1000)
      // Bob lost so his ELO should be below 1000
      expect(bob.eloRating).toBeLessThan(1000)
      // Alice should be ranked 1
      expect(alice.rank).toBe(1)
      expect(bob.rank).toBe(2)
      expect(alice.wins).toBe(1)
      expect(bob.losses).toBe(1)
    })

    it('updates Points Table after a verified football result', async () => {
      const configRes = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'football', scope: 'ALL_TIME', algorithm: 'POINTS_TABLE', pointsPerWin: 3,
      })
      const configId = configRes.body.data.id

      const compRes = await request.post('/competitions').set(JSON_HEADERS).send({
        name: 'Rankings Test Football', sport: 'football', format: 'LEAGUE', entryType: 'TEAM',
      })
      const compId = compRes.body.data.id
      const divId = compRes.body.data.divisions[0].id

      const entryA = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Team A', personId: PERSON_A, divisionId: divId })
      const entryB = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Team B', personId: PERSON_B, divisionId: divId })
      const entryC = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Team C', personId: PERSON_C, divisionId: divId })
      for (const e of [entryA, entryB, entryC]) {
        await request.patch(`/competitions/${compId}/entries/${e.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED' })
      }

      await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)

      const matchesRes = await request.get(`/competitions/${compId}/matches`).set(HEADERS)
      const firstMatch = matchesRes.body.data[0]

      await request.post(`/competitions/${compId}/matches/${firstMatch.id}/result`).set(JSON_HEADERS).send({
        winnerId: firstMatch.homeEntryId,
        homePoints: 2, awayPoints: 0,
        score: { home: 2, away: 0 },
        adminVerify: true,
      })

      const leaderboard = await request.get(`/rankings/${configId}`).set(HEADERS)
      expect(leaderboard.status).toBe(200)
      expect(leaderboard.body.data.length).toBeGreaterThanOrEqual(2)

      const winner = leaderboard.body.data.find((e: any) => e.rank === 1)
      expect(winner).toBeDefined()
      expect(winner.points).toBe(3)
      expect(winner.wins).toBe(1)
      expect(winner.goalsFor).toBe(2)
    })
  })
})
