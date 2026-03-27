import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanCompetitions } from './helpers/db.js'
import { TEST_TENANT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Standings — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => { const app = await getApp(); request = supertest(app.getHttpServer() as any) })
  afterEach(cleanCompetitions)
  afterAll(async () => { await cleanCompetitions(); await prisma.$disconnect(); await closeApp() })

  async function setupLeague(entryCount: number) {
    const comp = await request.post('/competitions').set(JSON_HEADERS).send({ name: 'Test League', sport: 'football', format: 'LEAGUE', entryType: 'INDIVIDUAL' })
    const compId = comp.body.data.id
    const divId = comp.body.data.divisions[0].id

    const entryIds: string[] = []
    for (let i = 1; i <= entryCount; i++) {
      const e = await request.post(`/competitions/${compId}/entries`).set(JSON_HEADERS).send({
        displayName: `Team ${i}`, personId: `00000000-0000-0000-0000-${String(i).padStart(12,'0')}`,
      })
      await request.patch(`/competitions/${compId}/entries/${e.body.data.id}`).set(JSON_HEADERS).send({ status: 'CONFIRMED', divisionId: divId })
      entryIds.push(e.body.data.id)
    }

    await request.post(`/competitions/${compId}/divisions/${divId}/draw`).set(HEADERS)
    return { compId, divId, entryIds }
  }

  it('recalculates standings after a verified result', async () => {
    const { compId, divId } = await setupLeague(3)

    // Get first match
    const matchesRes = await request.get(`/competitions/${compId}/matches?divisionId=${divId}`).set(HEADERS)
    const firstMatch = matchesRes.body.data.find((m: any) => m.homeEntryId && m.awayEntryId)
    expect(firstMatch).toBeDefined()

    // Submit & verify result (admin)
    await request.post(`/competitions/${compId}/matches/${firstMatch.id}/result`).set(JSON_HEADERS).send({
      winnerId: firstMatch.homeEntryId,
      score: { home: 2, away: 0 },
      homePoints: 2, awayPoints: 0,
      adminVerify: true,
    })

    // Check standings
    const standingsRes = await request.get(`/competitions/${compId}/divisions/${divId}/standings`).set(HEADERS)
    expect(standingsRes.status).toBe(200)
    const winner = standingsRes.body.data.find((s: any) => s.entryId === firstMatch.homeEntryId)
    expect(winner.won).toBe(1)
    expect(Number(winner.points)).toBe(3) // football: win = 3 points
    expect(winner.position).toBe(1)
  })

  it('two-step: player submits, admin verifies, standings update', async () => {
    const { compId, divId } = await setupLeague(2)
    const matchesRes = await request.get(`/competitions/${compId}/matches?divisionId=${divId}`).set(HEADERS)
    const match = matchesRes.body.data[0]

    // Player submits (no adminVerify)
    const submitRes = await request.post(`/competitions/${compId}/matches/${match.id}/result`).set(JSON_HEADERS).send({
      winnerId: match.homeEntryId, score: { home: 1, away: 0 }, homePoints: 1, awayPoints: 0,
      adminVerify: false,
    })
    expect(submitRes.body.data.resultStatus).toBe('SUBMITTED')

    // Standings not yet updated
    const standingsBefore = await request.get(`/competitions/${compId}/divisions/${divId}/standings`).set(HEADERS)
    const winnerBefore = standingsBefore.body.data.find((s: any) => s.entryId === match.homeEntryId)
    expect(winnerBefore?.won ?? 0).toBe(0)

    // Admin verifies
    const verifyRes = await request.post(`/competitions/${compId}/matches/${match.id}/result/verify`).set(HEADERS)
    expect(verifyRes.body.data.resultStatus).toBe('VERIFIED')

    // Now standings updated
    const standingsAfter = await request.get(`/competitions/${compId}/divisions/${divId}/standings`).set(HEADERS)
    const winnerAfter = standingsAfter.body.data.find((s: any) => s.entryId === match.homeEntryId)
    expect(winnerAfter.won).toBe(1)
  })
})
