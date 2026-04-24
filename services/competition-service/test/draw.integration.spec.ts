import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const DB_AVAILABLE = await checkDbAvailable()

async function createCompetitionWithEntries(request: ReturnType<typeof supertest>, format: string, sport: string, count: number) {
  const comp = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'Test', sport, format, entryType: 'INDIVIDUAL' })
  const compId = comp.body.data.id
  const divId = comp.body.data.divisions[0].id

  const entries: any[] = []
  for (let i = 1; i <= count; i++) {
    const e = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS).send({
      displayName: `Player ${i}`, personId: `00000000-0000-0000-0000-${String(i).padStart(12,'0')}`, seed: i,
    })
    await request.patch(`/competitions/${compId}/entries/${e.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED', divisionId: divId })
    entries.push(e.body.data)
  }
  return { compId, divId, entries }
}

describe.runIf(DB_AVAILABLE)('Draw — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => { const app = await getApp(); request = supertest(app.getHttpServer() as any) })
  afterEach(cleanCompetitions)
  afterAll(async () => { await cleanCompetitions(); await prisma.$disconnect(); await closeApp() })

  it('generates a round-robin draw for LEAGUE with 4 entries', async () => {
    const { compId, divId } = await createCompetitionWithEntries(request, 'LEAGUE', 'football', 4)
    const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    expect(res.status).toBe(201)
    // 4 entries → 3 rounds × 2 matches = 6 matches
    expect(res.body.matchesCreated).toBe(6)
  })

  it('generates a knockout bracket for KNOCKOUT with 8 entries', async () => {
    const { compId, divId } = await createCompetitionWithEntries(request, 'KNOCKOUT', 'tennis', 8)
    const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    expect(res.status).toBe(201)
    // 8 entries → 4 QF + 2 SF + 1 F = 7 matches
    expect(res.body.matchesCreated).toBe(7)
  })

  it('returns 409 when draw already generated', async () => {
    const { compId, divId } = await createCompetitionWithEntries(request, 'LEAGUE', 'football', 4)
    await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    expect(res.status).toBe(409)
  })

  it('returns 400 when fewer than 2 confirmed entries', async () => {
    const comp = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'Empty', sport: 'tennis', format: 'KNOCKOUT', entryType: 'INDIVIDUAL' })
    const compId = comp.body.data.id
    const divId = comp.body.data.divisions[0].id
    const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    expect(res.status).toBe(400)
  })

  // ── ELO seeding ────────────────────────────────────────────────────────────

  describe('POST .../draw/seed', () => {
    it('falls back to alphabetical when no ELO ranking config exists', async () => {
      const { compId, divId } = await createCompetitionWithEntries(request, 'KNOCKOUT', 'tennis', 4)
      const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw/seed`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.seeded).toBe(4)
      expect(res.body.source).toBe('fallback')
      // Verify seed numbers were written — Player 1..4 sorted alphabetically
      const entries = await prisma.entry.findMany({ where: { divisionId: divId }, orderBy: { seed: 'asc' } })
      expect(entries.every(e => e.seed !== null)).toBe(true)
      expect(entries.map(e => e.seed)).toEqual([1, 2, 3, 4])
    })

    it('seeds by ELO desc when a matching ranking config exists', async () => {
      // Create competition with tennis entries using fixed person IDs
      const comp = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'ELO Test', sport: 'tennis', format: 'KNOCKOUT', entryType: 'INDIVIDUAL' })
      const compId = comp.body.data.id
      const divId = comp.body.data.divisions[0].id

      const personIds = [
        'aa000000-0000-4000-8000-000000000001',
        'aa000000-0000-4000-8000-000000000002',
        'aa000000-0000-4000-8000-000000000003',
      ]
      const displayNames = ['Charlie', 'Alice', 'Bob']

      for (let i = 0; i < 3; i++) {
        const e = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS).send({
          displayName: displayNames[i], personId: personIds[i],
        })
        await request.patch(`/competitions/${compId}/entries/${e.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED', divisionId: divId })
      }

      // Create ELO ranking config and set ratings: Alice=1200, Bob=1100, Charlie=1050
      const configRes = await request.post('/rankings/configs').set(JSON_HEADERS).send({
        sport: 'tennis', scope: 'ALL_TIME', algorithm: 'ELO',
      })
      const configId = configRes.body.data.id
      const eloRatings: Record<string, number> = {
        'aa000000-0000-4000-8000-000000000001': 1050, // Charlie
        'aa000000-0000-4000-8000-000000000002': 1200, // Alice — highest
        'aa000000-0000-4000-8000-000000000003': 1100, // Bob
      }
      await prisma.$transaction(
        personIds.map(pid =>
          prisma.rankingEntry.create({
            data: { tenantId: TEST_TENANT_ID, configId, personId: pid, displayName: 'Test Player', sport: 'tennis', eloRating: eloRatings[pid] ?? 1000 },
          })
        )
      )

      const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw/seed`).set(HEADERS)
      expect(res.status).toBe(200)
      expect(res.body.seeded).toBe(3)
      expect(res.body.source).toBe('elo')

      // Alice (1200) → seed 1, Bob (1100) → seed 2, Charlie (1050) → seed 3
      const alice = await prisma.entry.findFirst({ where: { divisionId: divId, personId: 'aa000000-0000-4000-8000-000000000002' } })
      const bob   = await prisma.entry.findFirst({ where: { divisionId: divId, personId: 'aa000000-0000-4000-8000-000000000003' } })
      const charlie = await prisma.entry.findFirst({ where: { divisionId: divId, personId: 'aa000000-0000-4000-8000-000000000001' } })
      expect(alice?.seed).toBe(1)
      expect(bob?.seed).toBe(2)
      expect(charlie?.seed).toBe(3)

      // Cleanup ranking data
      await prisma.rankingEntry.deleteMany({ where: { tenantId: TEST_TENANT_ID } })
      await prisma.rankingConfig.deleteMany({ where: { tenantId: TEST_TENANT_ID } })
    })

    it('returns 400 when no confirmed entries to seed', async () => {
      const comp = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'Empty', sport: 'tennis', format: 'KNOCKOUT', entryType: 'INDIVIDUAL' })
      const compId = comp.body.data.id
      const divId = comp.body.data.divisions[0].id
      const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw/seed`).set(HEADERS)
      expect(res.status).toBe(400)
    })

    it('seed writes do not depend on prior seed values', async () => {
      // Entries already have seed=1..4 set in createCompetitionWithEntries — seeding should overwrite
      const { compId, divId } = await createCompetitionWithEntries(request, 'KNOCKOUT', 'tennis', 3)
      const res = await request.post(`/competitions/${compId}/divisions/${divId}/draw/seed`).set(HEADERS)
      expect(res.status).toBe(200)
      const seeds = (await prisma.entry.findMany({ where: { divisionId: divId }, orderBy: { seed: 'asc' } })).map(e => e.seed)
      expect(seeds).toEqual([1, 2, 3])
    })
  })
})
