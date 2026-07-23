import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanDisciplineCases } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const TEST_PERSON_ID = '60000000-0000-4000-8000-000000000098'

const CASE_PAYLOAD = {
  displayName: 'John Doe — Misconduct',
  description: 'Unsporting behaviour during match 42',
  personId: TEST_PERSON_ID,
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Discipline — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)
  })

  afterEach(cleanDisciplineCases)
  afterAll(async () => { await cleanDisciplineCases(); await prisma.$disconnect(); await closeApp() })

  describe('POST /discipline', () => {
    it('creates a discipline case with OPEN status', async () => {
      const res = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.displayName).toBe(CASE_PAYLOAD.displayName)
      expect(res.body.data.status).toBe('OPEN')
      expect(res.body.data.personId).toBe(TEST_PERSON_ID)
    })

    it('returns 400 when displayName is missing', async () => {
      const res = await request
        .post('/discipline')
        .set(JSON_HEADERS)
        .send({ description: 'No name given' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth', async () => {
      const res = await request.post('/discipline').send(CASE_PAYLOAD)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /discipline', () => {
    it('lists all discipline cases for the tenant', async () => {
      await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)

      const res = await request.get('/discipline').set(HEADERS)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('filters by personId', async () => {
      await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)

      const res = await request.get(`/discipline?personId=${TEST_PERSON_ID}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.every((c: any) => c.personId === TEST_PERSON_ID)).toBe(true)
    })

    it('returns 401 without auth', async () => {
      const res = await request.get('/discipline')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /discipline/:id', () => {
    it('returns a discipline case by id', async () => {
      const created = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)
      const id = created.body.data.id

      const res = await request.get(`/discipline/${id}`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(id)
      expect(res.body.data.displayName).toBe(CASE_PAYLOAD.displayName)
    })

    it('returns 404 for a non-existent case', async () => {
      const res = await request.get(`/discipline/${TEST_NONEXISTENT_ID}`).set(HEADERS)
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /discipline/:id', () => {
    it('updates the status of a discipline case', async () => {
      const created = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .patch(`/discipline/${id}`)
        .set(JSON_HEADERS)
        .send({ status: 'UNDER_REVIEW' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('UNDER_REVIEW')
    })

    it('returns 404 for a non-existent case', async () => {
      const res = await request
        .patch(`/discipline/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ status: 'CLOSED' })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /discipline/:id/actions', () => {
    it('adds a WARNING action to a discipline case', async () => {
      const created = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .post(`/discipline/${id}/actions`)
        .set(JSON_HEADERS)
        .send({ outcome: 'WARNING', notes: 'First offence — formal warning issued' })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.outcome).toBe('WARNING')
      expect(res.body.data.notes).toBe('First offence — formal warning issued')
    })

    it('adds a MATCH_BAN action with banMatches count', async () => {
      const created = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .post(`/discipline/${id}/actions`)
        .set(JSON_HEADERS)
        .send({ outcome: 'MATCH_BAN', banMatches: 3 })

      expect(res.status).toBe(201)
      expect(res.body.data.outcome).toBe('MATCH_BAN')
      expect(res.body.data.banMatches).toBe(3)
    })

    it('returns 400 when outcome is missing', async () => {
      const created = await request.post('/discipline').set(JSON_HEADERS).send(CASE_PAYLOAD)
      const id = created.body.data.id

      const res = await request
        .post(`/discipline/${id}/actions`)
        .set(JSON_HEADERS)
        .send({ notes: 'No outcome given' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when case does not exist', async () => {
      const res = await request
        .post(`/discipline/${TEST_NONEXISTENT_ID}/actions`)
        .set(JSON_HEADERS)
        .send({ outcome: 'WARNING' })

      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request
        .post(`/discipline/${TEST_NONEXISTENT_ID}/actions`)
        .send({ outcome: 'WARNING' })

      expect(res.status).toBe(401)
    })
  })
})
