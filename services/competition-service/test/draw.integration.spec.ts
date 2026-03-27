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
})
