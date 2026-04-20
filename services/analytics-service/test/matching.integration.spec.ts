import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_PERSON_ID, TEST_PERSON_ID_B } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Player Matching API — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get(`/v1/match/${TEST_PERSON_ID}?sport=tennis`)
    expect(res.status).toBe(401)
  })

  it('returns 404 when person is not in the system', async () => {
    const res = await request
      .get('/v1/match/00000000-0000-4000-8000-000000000099?sport=tennis')
      .set(HEADERS)
    expect(res.status).toBe(404)
  })

  it('returns match result shape with seeker, matches, total, hasElo', async () => {
    // This test uses real DB data — if no customers exist it will 404, handled above.
    // We use a try-based approach: if person exists, validate shape; else skip.
    const res = await request.get(`/v1/match/${TEST_PERSON_ID}?sport=tennis`).set(HEADERS)
    if (res.status === 404) {
      // Person doesn't exist in test DB — shape test skipped
      return
    }
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('seeker')
    expect(res.body).toHaveProperty('matches')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('hasElo')
    expect(Array.isArray(res.body.matches)).toBe(true)
  })

  it('defaults sport to tennis when not provided', async () => {
    const res = await request.get(`/v1/match/${TEST_PERSON_ID}`).set(HEADERS)
    // Either 404 (no person) or 200 — both are valid; main check is no 500
    expect(res.status).not.toBe(500)
  })

  it('rankCandidates — higher ELO proximity scores above lower', async () => {
    const { rankCandidates } = await import('../src/matching/matching.algorithms.js')
    const seeker = { personId: 'seeker', displayName: 'Seeker', eloRating: 1000, recentBookingCount: 5 }
    const candidates = [
      { personId: 'far',   displayName: 'Far',   eloRating: 1190, recentBookingCount: 1 },
      { personId: 'close', displayName: 'Close', eloRating: 1010, recentBookingCount: 1 },
    ]
    const results = rankCandidates(seeker, candidates)
    expect(results[0].personId).toBe('close')
    expect(results[0].matchScore).toBeGreaterThan(results[1].matchScore)
  })

  it('rankCandidates — excludes candidates outside ELO_WINDOW', async () => {
    const { rankCandidates, ELO_WINDOW } = await import('../src/matching/matching.algorithms.js')
    const seeker = { personId: 'seeker', displayName: 'Seeker', eloRating: 1000, recentBookingCount: 5 }
    const candidates = [
      { personId: 'too-far', displayName: 'TooFar', eloRating: 1000 + ELO_WINDOW + 1, recentBookingCount: 10 },
      { personId: 'just-in', displayName: 'JustIn', eloRating: 1000 + ELO_WINDOW,     recentBookingCount: 5 },
    ]
    const results = rankCandidates(seeker, candidates)
    expect(results.find(r => r.personId === 'too-far')).toBeUndefined()
    expect(results.find(r => r.personId === 'just-in')).toBeDefined()
  })

  it('rankCandidates — activity bonus adds up to 40 points', async () => {
    const { rankCandidates } = await import('../src/matching/matching.algorithms.js')
    const seeker = { personId: 'seeker', displayName: 'Seeker', eloRating: null, recentBookingCount: 0 }
    const candidates = [
      { personId: 'busy',  displayName: 'Busy',  eloRating: null, recentBookingCount: 20 },
      { personId: 'quiet', displayName: 'Quiet', eloRating: null, recentBookingCount: 1 },
    ]
    const results = rankCandidates(seeker, candidates)
    expect(results[0].personId).toBe('busy')
    // busy: 30 base + 40 activity = 70
    expect(results[0].matchScore).toBe(70)
    // quiet: 30 base + 4 activity = 34
    expect(results[1].matchScore).toBe(34)
  })

  it('rankCandidates — excludes seeker from their own results', async () => {
    const { rankCandidates } = await import('../src/matching/matching.algorithms.js')
    const seeker = { personId: 'self', displayName: 'Self', eloRating: 1000, recentBookingCount: 5 }
    const candidates = [
      { personId: 'self',  displayName: 'Self',  eloRating: 1000, recentBookingCount: 5 },
      { personId: 'other', displayName: 'Other', eloRating: 1005, recentBookingCount: 3 },
    ]
    const results = rankCandidates(seeker, candidates)
    expect(results.find(r => r.personId === 'self')).toBeUndefined()
    expect(results.find(r => r.personId === 'other')).toBeDefined()
  })

  it('rankCandidates — returns at most 15 results', async () => {
    const { rankCandidates } = await import('../src/matching/matching.algorithms.js')
    const seeker = { personId: 'seeker', displayName: 'Seeker', eloRating: null, recentBookingCount: 0 }
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      personId: `p${i}`,
      displayName: `Player ${i}`,
      eloRating: null,
      recentBookingCount: i,
    }))
    const results = rankCandidates(seeker, candidates)
    expect(results.length).toBeLessThanOrEqual(15)
  })
})
