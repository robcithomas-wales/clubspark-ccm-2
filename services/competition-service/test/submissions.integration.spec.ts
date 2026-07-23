import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const COMPETITION = {
  name: 'Submissions Test Cup',
  sport: 'tennis',
  format: 'KNOCKOUT',
  entryType: 'INDIVIDUAL',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Tournament Submissions — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanCompetitions)
  afterAll(async () => { await cleanCompetitions(); await prisma.$disconnect(); await closeApp() })

  describe('POST /submissions', () => {
    it('creates a submission linked to a competition', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      expect(comp.status).toBe(201)
      const compId = comp.body.data.id

      const res = await request
        .post('/submissions')
        .set(JSON_HEADERS)
        .send({ competitionId: compId, governingBody: 'LTA' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.competitionId).toBe(compId)
      expect(res.body.data.status).toBe('SUBMITTED')
      expect(res.body.data.governingBody).toBe('LTA')
    })

    it('returns 400 when competitionId is missing', async () => {
      const res = await request
        .post('/submissions')
        .set(JSON_HEADERS)
        .send({ governingBody: 'LTA' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/submissions').send({ competitionId: TEST_NONEXISTENT_ID })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /submissions', () => {
    it('lists all submissions for the tenant', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })

      const res = await request.get('/submissions').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters submissions by competitionId', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })

      const res = await request.get(`/submissions?competitionId=${compId}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((s: any) => s.competitionId === compId)).toBe(true)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/submissions')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /submissions/:id', () => {
    it('returns a submission by id', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      const created = await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })
      const id = created.body.data.id

      const res = await request.get(`/submissions/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
    })

    it('returns 404 for a non-existent submission', async () => {
      const res = await request.get(`/submissions/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /submissions/:id/acknowledge', () => {
    it('transitions status from SUBMITTED to ACKNOWLEDGED', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      const created = await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })
      const id = created.body.data.id

      const res = await request
        .post(`/submissions/${id}/acknowledge`)
        .set(JSON_HEADERS)
        .send({ externalRef: 'LTA-2026-001' })

      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('ACKNOWLEDGED')
      expect(res.body.data.externalRef).toBe('LTA-2026-001')
    })

    it('returns 400 when submission is not in SUBMITTED state', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      const created = await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })
      const id = created.body.data.id

      // Acknowledge once
      await request.post(`/submissions/${id}/acknowledge`).set(JSON_HEADERS).send({})

      // Try to acknowledge again
      const res = await request.post(`/submissions/${id}/acknowledge`).set(JSON_HEADERS).send({})
      expect(res.status).toBe(400)
    })

    it('returns 404 for a non-existent submission', async () => {
      const res = await request
        .post(`/submissions/${TEST_NONEXISTENT_ID}/acknowledge`)
        .set(JSON_HEADERS)
        .send({})

      expect(res.status).toBe(404)
    })
  })

  describe('POST /submissions/:id/reject', () => {
    it('transitions status from SUBMITTED to REJECTED', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      const created = await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })
      const id = created.body.data.id

      const res = await request
        .post(`/submissions/${id}/reject`)
        .set(JSON_HEADERS)
        .send({ reason: 'Incomplete entry data' })

      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('REJECTED')
    })

    it('returns 400 when already acknowledged', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id
      const created = await request.post('/submissions').set(JSON_HEADERS).send({ competitionId: compId })
      const id = created.body.data.id

      await request.post(`/submissions/${id}/acknowledge`).set(JSON_HEADERS).send({})

      const res = await request
        .post(`/submissions/${id}/reject`)
        .set(JSON_HEADERS)
        .send({ reason: 'Too late' })

      expect(res.status).toBe(400)
    })

    it('returns 404 for a non-existent submission', async () => {
      const res = await request
        .post(`/submissions/${TEST_NONEXISTENT_ID}/reject`)
        .set(JSON_HEADERS)
        .send({ reason: 'Not found' })

      expect(res.status).toBe(404)
    })
  })
})
