import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_TEAM = { name: 'First XI', sport: 'football', season: '2024/25', defaultMatchFee: 10, juniorMatchFee: 5 }
const VALID_FIXTURE = {
  opponent: 'Town FC',
  kickoffAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  homeAway: 'home',
  durationMinutes: 90,
  matchType: 'league',
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Selection & Charges — integration', () => {
  let request: ReturnType<typeof supertest>
  let teamId: string
  let fixtureId: string
  let member1Id: string
  let member2Id: string

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

  async function setupFixtureWithMembers() {
    const teamRes = await request.post('/teams').set(JSON_HEADERS).send(VALID_TEAM)
    teamId = teamRes.body.data.id

    const fixRes = await request
      .post(`/teams/${teamId}/fixtures`)
      .set(JSON_HEADERS)
      .send(VALID_FIXTURE)
    fixtureId = fixRes.body.data.id

    const m1 = await request
      .post(`/teams/${teamId}/roster`)
      .set(JSON_HEADERS)
      .send({ displayName: 'Jamie Smith' })
    member1Id = m1.body.data.id

    const m2 = await request
      .post(`/teams/${teamId}/roster`)
      .set(JSON_HEADERS)
      .send({ displayName: 'Alex Jones', isJunior: true })
    member2Id = m2.body.data.id
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('sets a full selection for a fixture', async () => {
      await setupFixtureWithMembers()

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({
          players: [
            { teamMemberId: member1Id, role: 'starter', position: 'Midfielder', shirtNumber: 8 },
            { teamMemberId: member2Id, role: 'substitute' },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('returns selection summary on GET', async () => {
      await setupFixtureWithMembers()

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({
          players: [
            { teamMemberId: member1Id, role: 'starter' },
            { teamMemberId: member2Id, role: 'substitute' },
          ],
        })

      const res = await request
        .get(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.summary.starters).toBe(1)
      expect(res.body.summary.substitutes).toBe(1)
      expect(res.body.summary.isPublished).toBe(false)
    })

    it('publishes a selection', async () => {
      await setupFixtureWithMembers()

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({ players: [{ teamMemberId: member1Id, role: 'starter' }] })

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection/publish`)
        .set(JSON_HEADERS)
        .send({})

      expect(res.status).toBe(200)

      const check = await request
        .get(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(HEADERS)
      expect(check.body.summary.isPublished).toBe(true)
    })

    it('replaces an existing selection on re-post', async () => {
      await setupFixtureWithMembers()

      // First selection — both players
      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({
          players: [
            { teamMemberId: member1Id, role: 'starter' },
            { teamMemberId: member2Id, role: 'starter' },
          ],
        })

      // Update — only one player
      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({ players: [{ teamMemberId: member1Id, role: 'starter' }] })

      expect(res.body.data).toHaveLength(1)
    })

    it('returns 400 with an invalid role', async () => {
      await setupFixtureWithMembers()

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({ players: [{ teamMemberId: member1Id, role: 'bench' }] })

      expect(res.status).toBe(400)
    })
  })

  // ── Charges ───────────────────────────────────────────────────────────────

  describe('Charges', () => {
    it('creates a charge run using the team fee schedule', async () => {
      await setupFixtureWithMembers()

      // Set selection first
      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({
          players: [
            { teamMemberId: member1Id, role: 'starter' },
            { teamMemberId: member2Id, role: 'starter' },
          ],
        })

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/charge-runs`)
        .set(JSON_HEADERS)
        .send({ notes: 'Weekly fee' })

      expect(res.status).toBe(201)
      expect(res.body.data.charges).toHaveLength(2)
      // Senior player gets defaultMatchFee (10), junior gets juniorMatchFee (5)
      const amounts = res.body.data.charges.map((c: { amount: string }) => Number(c.amount))
      expect(amounts).toContain(10)
      expect(amounts).toContain(5)
    })

    it('returns 400 when trying to charge a cancelled fixture', async () => {
      await setupFixtureWithMembers()

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({ players: [{ teamMemberId: member1Id, role: 'starter' }] })

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/cancel`)
        .set(JSON_HEADERS)
        .send({ reason: 'Postponed' })

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/charge-runs`)
        .set(JSON_HEADERS)
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 400 when no selection exists', async () => {
      await setupFixtureWithMembers()

      const res = await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/charge-runs`)
        .set(JSON_HEADERS)
        .send({})
      expect(res.status).toBe(400)
    })

    it('lists charge runs for a fixture', async () => {
      await setupFixtureWithMembers()

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/selection`)
        .set(JSON_HEADERS)
        .send({ players: [{ teamMemberId: member1Id, role: 'starter' }] })

      await request
        .post(`/teams/${teamId}/fixtures/${fixtureId}/charge-runs`)
        .set(JSON_HEADERS)
        .send({})

      const res = await request
        .get(`/teams/${teamId}/fixtures/${fixtureId}/charge-runs`)
        .set(HEADERS)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
    })
  })
})
