import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanScores } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B, TEST_PERSON_ID, TEST_PERSON_ID_B } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const HEADERS_B = { 'x-tenant-id': TEST_TENANT_ID_B }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Scoring API — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    await cleanScores()
  })

  afterAll(async () => {
    await cleanScores()
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/v1/scores')
    expect(res.status).toBe(401)
  })

  it('returns empty list when no scores computed', async () => {
    const res = await request.get('/v1/scores').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })

  it('returns null for unknown personId', async () => {
    const res = await request.get(`/v1/scores/${TEST_PERSON_ID}`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('stores and retrieves a score via upsert', async () => {
    await prisma.memberScore.create({
      data: {
        tenantId: TEST_TENANT_ID,
        personId: TEST_PERSON_ID,
        churnRisk: 72,
        churnBand: 'high',
        churnFactors: { lastBookingAge: 45, autoRenewOff: 12 },
        ltvScore: 125000,
        ltvFactors: { bookingRevenue: 100000, membershipValue: 25000 },
        defaultRisk: 20,
        defaultBand: 'low',
        defaultFactors: {},
        optimalSendHour: 9,
        sendHourConfidence: 0.6,
        computedAt: new Date(),
      },
    })

    const res = await request.get(`/v1/scores/${TEST_PERSON_ID}`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.personId).toBe(TEST_PERSON_ID)
    expect(res.body.churnRisk).toBe(72)
    expect(res.body.churnBand).toBe('high')
    expect(res.body.ltvScore).toBe(125000)
    expect(res.body.ltvScoreFormatted).toBe('£1250.00')
    expect(res.body.optimalSendHour).toBe(9)
  })

  it('lists scores sorted by churn risk desc', async () => {
    await prisma.memberScore.createMany({
      data: [
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID,   churnRisk: 80, churnBand: 'high',   churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID_B, churnRisk: 20, churnBand: 'low',    churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
      ],
    })

    const res = await request.get('/v1/scores').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].churnRisk).toBe(80)
    expect(res.body.data[1].churnRisk).toBe(20)
  })

  it('filters by minChurnRisk', async () => {
    await prisma.memberScore.createMany({
      data: [
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID,   churnRisk: 80, churnBand: 'high', churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID_B, churnRisk: 20, churnBand: 'low',  churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
      ],
    })

    const res = await request.get('/v1/scores?minChurnRisk=65').set(HEADERS)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].churnRisk).toBe(80)
  })

  it('bulk endpoint returns score map keyed by personId', async () => {
    await prisma.memberScore.createMany({
      data: [
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID,   churnRisk: 80, churnBand: 'high', churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
        { tenantId: TEST_TENANT_ID, personId: TEST_PERSON_ID_B, churnRisk: 20, churnBand: 'low',  churnFactors: {}, ltvScore: 0, ltvFactors: {}, defaultRisk: 0, defaultBand: 'low', defaultFactors: {}, computedAt: new Date() },
      ],
    })

    const res = await request
      .post('/v1/scores/bulk')
      .set({ ...HEADERS, 'content-type': 'application/json' })
      .send({ personIds: [TEST_PERSON_ID, TEST_PERSON_ID_B] })

    expect(res.status).toBe(200)
    expect(res.body[TEST_PERSON_ID].churnRisk).toBe(80)
    expect(res.body[TEST_PERSON_ID_B].churnRisk).toBe(20)
  })

  it('tenant isolation — tenant B cannot see tenant A scores', async () => {
    await prisma.memberScore.create({
      data: {
        tenantId: TEST_TENANT_ID,
        personId: TEST_PERSON_ID,
        churnRisk: 70, churnBand: 'high', churnFactors: {},
        ltvScore: 0, ltvFactors: {},
        defaultRisk: 0, defaultBand: 'low', defaultFactors: {},
        computedAt: new Date(),
      },
    })

    const res = await request.get('/v1/scores').set(HEADERS_B)
    expect(res.body.data).toHaveLength(0)
  })

  it('GET /v1/scores/:personId returns null for wrong tenant', async () => {
    await prisma.memberScore.create({
      data: {
        tenantId: TEST_TENANT_ID,
        personId: TEST_PERSON_ID,
        churnRisk: 70, churnBand: 'high', churnFactors: {},
        ltvScore: 0, ltvFactors: {},
        defaultRisk: 0, defaultBand: 'low', defaultFactors: {},
        computedAt: new Date(),
      },
    })

    const res = await request.get(`/v1/scores/${TEST_PERSON_ID}`).set(HEADERS_B)
    expect(res.body).toBeNull()
  })

  it('ltvScoreFormatted is formatted as £X.XX', async () => {
    await prisma.memberScore.create({
      data: {
        tenantId: TEST_TENANT_ID,
        personId: TEST_PERSON_ID,
        churnRisk: 20, churnBand: 'low', churnFactors: {},
        ltvScore: 125000,
        ltvFactors: {},
        defaultRisk: 0, defaultBand: 'low', defaultFactors: {},
        computedAt: new Date(),
      },
    })

    const res = await request.get(`/v1/scores/${TEST_PERSON_ID}`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.ltvScoreFormatted).toBe('£1250.00')
  })

  it('GET /v1/scores respects page and limit params', async () => {
    await prisma.memberScore.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        tenantId: TEST_TENANT_ID,
        personId: `55000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        churnRisk: 50 + i, churnBand: 'medium', churnFactors: {},
        ltvScore: 0, ltvFactors: {},
        defaultRisk: 0, defaultBand: 'low', defaultFactors: {},
        computedAt: new Date(),
      })),
    })

    const res = await request.get('/v1/scores?limit=2&page=1').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination.total).toBe(5)
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(3)
  })

  it('POST /v1/scores/compute returns scheduled:true', async () => {
    const res = await request.post('/v1/scores/compute').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.scheduled).toBe(true)
  })
})
