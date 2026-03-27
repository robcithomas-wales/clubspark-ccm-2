import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

// personId must be a valid UUID (column is @db.Uuid)
const PERSON_A = '61000000-0000-4000-8000-000000000001'
const PERSON_B = '61000000-0000-4000-8000-000000000002'
const PERSON_C = '61000000-0000-4000-8000-000000000003'

const DB_AVAILABLE = await checkDbAvailable()

const LEAGUE_PAYLOAD = {
  name: 'Entries Test League',
  sport: 'tennis',
  format: 'LEAGUE',
  entryType: 'INDIVIDUAL',
  isPublic: true,
}

describe.runIf(DB_AVAILABLE)('Entries — integration', () => {
  let request: ReturnType<typeof supertest>
  let competitionId: string
  let divisionId: string

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as any)

    // Create a competition with a default division
    const res = await request.post('/competitions').set(JSON_HEADERS).send(LEAGUE_PAYLOAD)
    expect(res.status).toBe(201)
    competitionId = res.body.data.id
    divisionId = res.body.data.divisions[0].id
  })

  afterEach(async () => {
    // Delete entries only — keep competition + division between tests
    if (competitionId) {
      await prisma.entry.deleteMany({ where: { competitionId } })
    }
  })

  afterAll(async () => {
    await cleanCompetitions()
    await prisma.$disconnect()
    await closeApp()
  })

  // ── POST /competitions/:id/entries ─────────────────────────────────────────

  describe('POST /competitions/:id/entries', () => {
    it('creates a PENDING entry in the default division', async () => {
      const res = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'Alice Smith', personId: PERSON_A, divisionId })

      expect(res.status).toBe(201)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.displayName).toBe('Alice Smith')
      expect(res.body.data.status).toBe('PENDING')
      expect(res.body.data.competitionId).toBe(competitionId)
      expect(res.body.data.divisionId).toBe(divisionId)
    })

    it('creates an entry with personId but no explicit divisionId', async () => {
      const res = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'Bob Jones', personId: PERSON_B })

      expect(res.status).toBe(201)
      expect(res.body.data.displayName).toBe('Bob Jones')
    })

    it('returns 400 when displayName is missing', async () => {
      const res = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ personId: PERSON_A, divisionId })

      expect(res.status).toBe(400)
    })

    it('returns 400 when neither personId nor teamId is supplied', async () => {
      const res = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'No Person' })

      expect(res.status).toBe(400)
    })

    it('returns 401 without auth headers', async () => {
      const res = await request
        .post(`/competitions/${competitionId}/entries`)
        .send({ displayName: 'Unauthorised', personId: PERSON_A })

      expect(res.status).toBe(401)
    })
  })

  // ── GET /competitions/:id/entries ──────────────────────────────────────────

  describe('GET /competitions/:id/entries', () => {
    it('returns empty list when no entries exist', async () => {
      const res = await request
        .get(`/competitions/${competitionId}/entries`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })

    it('lists all entries for a competition', async () => {
      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Player One', personId: PERSON_A, divisionId })
      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Player Two', personId: PERSON_B, divisionId })

      const res = await request.get(`/competitions/${competitionId}/entries`).set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('filters entries by divisionId', async () => {
      // Create a second division
      const divRes = await request
        .post(`/competitions/${competitionId}/divisions`)
        .set(JSON_HEADERS)
        .send({ name: 'Division B' })
      expect(divRes.status).toBe(201)
      const divBId = divRes.body.data.id

      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Div A Player', personId: PERSON_A, divisionId })
      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Div B Player', personId: PERSON_B, divisionId: divBId })

      const res = await request
        .get(`/competitions/${competitionId}/entries?divisionId=${divisionId}`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].displayName).toBe('Div A Player')
    })

    it('includes entry fields (displayName, status, divisionId, personId)', async () => {
      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Detail Player', personId: PERSON_A, divisionId })

      const res = await request.get(`/competitions/${competitionId}/entries`).set(HEADERS)
      const entry = res.body.data[0]

      expect(entry.displayName).toBe('Detail Player')
      expect(entry.status).toBe('PENDING')
      expect(entry.divisionId).toBe(divisionId)
      expect(entry.personId).toBe(PERSON_A)
    })
  })

  // ── PATCH /competitions/:id/entries/:entryId ───────────────────────────────

  describe('PATCH /competitions/:id/entries/:entryId', () => {
    it('updates entry status to CONFIRMED', async () => {
      const created = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'Patch Player', personId: PERSON_A, divisionId })
      const entryId = created.body.data.id

      const res = await request
        .patch(`/competitions/${competitionId}/entries/${entryId}`)
        .set(JSON_HEADERS)
        .send({ status: 'CONFIRMED' })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('CONFIRMED')
    })

    it('updates displayName', async () => {
      const created = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'Old Name', personId: PERSON_A, divisionId })
      const entryId = created.body.data.id

      const res = await request
        .patch(`/competitions/${competitionId}/entries/${entryId}`)
        .set(JSON_HEADERS)
        .send({ displayName: 'New Name' })

      expect(res.status).toBe(200)
      expect(res.body.data.displayName).toBe('New Name')
    })

    it('returns 404 for non-existent entry', async () => {
      const res = await request
        .patch(`/competitions/${competitionId}/entries/${TEST_NONEXISTENT_ID}`)
        .set(JSON_HEADERS)
        .send({ status: 'CONFIRMED' })

      expect(res.status).toBe(404)
    })
  })

  // ── POST /competitions/:id/entries/bulk-confirm ────────────────────────────

  describe('POST /competitions/:id/entries/bulk-confirm', () => {
    it('confirms all PENDING entries in the division', async () => {
      // Create 3 pending entries
      for (const [name, pid] of [['Alpha', PERSON_A], ['Beta', PERSON_B], ['Gamma', PERSON_C]]) {
        await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
          .send({ displayName: name, personId: pid, divisionId })
      }

      const res = await request
        .post(`/competitions/${competitionId}/entries/bulk-confirm`)
        .set(HEADERS)
        .query({ divisionId })

      expect(res.status).toBe(200)
      expect(res.body.confirmed).toBe(3)

      // Verify all entries in the division are now CONFIRMED
      const list = await request
        .get(`/competitions/${competitionId}/entries?divisionId=${divisionId}`)
        .set(HEADERS)
      expect(list.body.data.every((e: any) => e.status === 'CONFIRMED')).toBe(true)
    })

    it('does not confirm entries that are already CONFIRMED', async () => {
      // Create one entry and confirm it manually
      const created = await request
        .post(`/competitions/${competitionId}/entries`)
        .set(JSON_HEADERS)
        .send({ displayName: 'Already Confirmed', personId: PERSON_A, divisionId })
      await request
        .patch(`/competitions/${competitionId}/entries/${created.body.data.id}`)
        .set(JSON_HEADERS)
        .send({ status: 'CONFIRMED' })

      // Add a second pending entry
      await request.post(`/competitions/${competitionId}/entries`).set(JSON_HEADERS)
        .send({ displayName: 'Still Pending', personId: PERSON_B, divisionId })

      const res = await request
        .post(`/competitions/${competitionId}/entries/bulk-confirm`)
        .set(HEADERS)
        .query({ divisionId })

      // Only the pending one is counted as newly confirmed
      expect(res.status).toBe(200)
      expect(res.body.confirmed).toBe(1)
    })
  })
})
