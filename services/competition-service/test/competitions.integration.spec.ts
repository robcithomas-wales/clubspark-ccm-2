import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const FOOTBALL_LEAGUE = {
  name: 'Summer Football League 2026',
  sport: 'football',
  format: 'LEAGUE',
  entryType: 'TEAM',
  season: '2026 Summer',
  isPublic: true,
}

const TENNIS_KNOCKOUT = {
  name: 'Open Tennis Championship 2026',
  sport: 'tennis',
  format: 'KNOCKOUT',
  entryType: 'INDIVIDUAL',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Competitions — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanCompetitions)
  afterAll(async () => { await cleanCompetitions(); await prisma.$disconnect(); await closeApp() })

  describe('POST /competitions', () => {
    it('creates a competition with a default Main division', async () => {
      const res = await request.post('/competitions').set(JSON_HEADERS).send(FOOTBALL_LEAGUE)
      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('Summer Football League 2026')
      expect(res.body.data.format).toBe('LEAGUE')
      expect(res.body.data.divisions).toHaveLength(1)
      expect(res.body.data.divisions[0].name).toBe('Main')
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'Incomplete' })
      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/competitions').send(FOOTBALL_LEAGUE)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /competitions', () => {
    it('returns empty list when no competitions exist', async () => {
      const res = await request.get('/competitions').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.pagination.total).toBe(0)
    })

    it('lists competitions with sportConfig attached', async () => {
      await request.post('/competitions').set(JSON_HEADERS).send(FOOTBALL_LEAGUE)
      await request.post('/competitions').set(JSON_HEADERS).send(TENNIS_KNOCKOUT)
      const res = await request.get('/competitions').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0].sportConfig).toBeDefined()
    })

    it('filters by status', async () => {
      await request.post('/competitions').set(JSON_HEADERS).send(FOOTBALL_LEAGUE)
      const listRes = await request.get('/competitions').set(HEADERS)
      const id = listRes.body.data[0].id
      await request.patch(`/competitions/${id}`).set(JSON_HEADERS).send({ status: 'REGISTRATION_OPEN' })
      const res = await request.get('/competitions?status=REGISTRATION_OPEN').set(HEADERS)
      expect(res.body.data).toHaveLength(1)
    })
  })

  describe('PATCH /competitions/:id', () => {
    it('updates competition status', async () => {
      const created = await request.post('/competitions').set(JSON_HEADERS).send(FOOTBALL_LEAGUE)
      const id = created.body.data.id
      const res = await request.patch(`/competitions/${id}`).set(JSON_HEADERS).send({ status: 'IN_PROGRESS' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('IN_PROGRESS')
    })

    it('returns 404 for non-existent competition', async () => {
      const res = await request.patch(`/competitions/${TEST_NONEXISTENT_ID}`).set(JSON_HEADERS).send({ status: 'IN_PROGRESS' })
      expect(res.status).toBe(404)
    })
  })
})
