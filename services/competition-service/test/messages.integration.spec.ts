import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const COMPETITION = {
  name: 'Messages Test League',
  sport: 'tennis',
  format: 'LEAGUE',
  entryType: 'INDIVIDUAL',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Competition Messages — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanCompetitions)
  afterAll(async () => { await cleanCompetitions(); await prisma.$disconnect(); await closeApp() })

  describe('GET /competitions/:id/messages', () => {
    it('returns empty list for a competition with no messages', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      expect(comp.status).toBe(201)

      const res = await request.get(`/competitions/${comp.body.data.id}/messages`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data).toHaveLength(0)
    })

    it('returns 404 for a non-existent competition', async () => {
      const res = await request.get(`/competitions/${TEST_NONEXISTENT_ID}/messages`).set(HEADERS)
      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get(`/competitions/${TEST_NONEXISTENT_ID}/messages`)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /competitions/:id/messages', () => {
    it('sends a message to all entrants and returns it', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      expect(comp.status).toBe(201)
      const compId = comp.body.data.id

      const res = await request
        .post(`/competitions/${compId}/messages`)
        .set(JSON_HEADERS)
        .send({ subject: 'Welcome', body: 'Good luck to all!', audience: 'ALL_ENTRANTS' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.subject).toBe('Welcome')
      expect(res.body.data.body).toBe('Good luck to all!')
      expect(res.body.data.audience).toBe('ALL_ENTRANTS')
    })

    it('sent message appears in subsequent list', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id

      await request
        .post(`/competitions/${compId}/messages`)
        .set(JSON_HEADERS)
        .send({ subject: 'Round 1 draw', body: 'See attached.' })

      const list = await request.get(`/competitions/${compId}/messages`).set(HEADERS)
      expect(list.status).toBe(200)
      expect(list.body.data).toHaveLength(1)
      expect(list.body.data[0].subject).toBe('Round 1 draw')
    })

    it('returns 400 when subject is missing', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send(COMPETITION)
      const compId = comp.body.data.id

      const res = await request
        .post(`/competitions/${compId}/messages`)
        .set(JSON_HEADERS)
        .send({ body: 'No subject here' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when competition does not exist', async () => {
      const res = await request
        .post(`/competitions/${TEST_NONEXISTENT_ID}/messages`)
        .set(JSON_HEADERS)
        .send({ subject: 'Test', body: 'Body' })

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request
        .post(`/competitions/${TEST_NONEXISTENT_ID}/messages`)
        .send({ subject: 'Test', body: 'Body' })

      expect(res.status).toBe(401)
    })
  })
})
