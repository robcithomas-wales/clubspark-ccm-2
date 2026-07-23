import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanWorkCards } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const TEST_PERSON_ID = '60000000-0000-4000-8000-000000000099'

const WORK_CARD = {
  personId: TEST_PERSON_ID,
  sport: 'tennis',
  grade: 'County',
  ltaRating: 8.5,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Work Cards — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanWorkCards)
  afterAll(async () => { await cleanWorkCards(); await prisma.$disconnect(); await closeApp() })

  describe('POST /work-cards (upsert)', () => {
    it('creates a work card and returns it', async () => {
      const res = await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.personId).toBe(TEST_PERSON_ID)
      expect(res.body.data.sport).toBe('tennis')
      expect(res.body.data.grade).toBe('County')
    })

    it('updates an existing card when called again for the same person+sport', async () => {
      await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)

      const updated = await request
        .post('/work-cards')
        .set(JSON_HEADERS)
        .send({ ...WORK_CARD, grade: 'National' })

      expect(updated.status).toBe(200)
      expect(updated.body.data.grade).toBe('National')
    })

    it('returns 400 when personId is missing', async () => {
      const res = await request
        .post('/work-cards')
        .set(JSON_HEADERS)
        .send({ sport: 'tennis', grade: 'County' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/work-cards').send(WORK_CARD)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /work-cards', () => {
    it('lists all work cards for the tenant', async () => {
      await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)

      const res = await request.get('/work-cards').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters by sport', async () => {
      await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)
      await request.post('/work-cards').set(JSON_HEADERS).send({ personId: TEST_PERSON_ID, sport: 'squash' })

      const res = await request.get('/work-cards?sport=tennis').set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((c: any) => c.sport === 'tennis')).toBe(true)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/work-cards')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /work-cards/person/:personId', () => {
    it('returns work cards for a specific person', async () => {
      await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)

      const res = await request.get(`/work-cards/person/${TEST_PERSON_ID}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.every((c: any) => c.personId === TEST_PERSON_ID)).toBe(true)
    })

    it('returns empty list for a person with no work cards', async () => {
      const res = await request
        .get('/work-cards/person/60000000-0000-4000-8000-000000000000')
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })

  describe('DELETE /work-cards/person/:personId/:sport', () => {
    it('deletes a work card for a person+sport', async () => {
      await request.post('/work-cards').set(JSON_HEADERS).send(WORK_CARD)

      const del = await request
        .delete(`/work-cards/person/${TEST_PERSON_ID}/tennis`)
        .set(HEADERS)

      expect(del.status).toBe(204)

      const list = await request.get(`/work-cards/person/${TEST_PERSON_ID}`).set(HEADERS)
      expect(list.body.data).toHaveLength(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request.delete(`/work-cards/person/${TEST_PERSON_ID}/tennis`)
      expect(res.status).toBe(401)
    })
  })
})
