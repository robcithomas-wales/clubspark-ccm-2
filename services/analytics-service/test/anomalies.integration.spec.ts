import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAnomalies } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B, TEST_PERSON_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const HEADERS_B = { 'x-tenant-id': TEST_TENANT_ID_B }

const DB_AVAILABLE = await checkDbAvailable()

async function seedFlag(overrides: Record<string, unknown> = {}) {
  return prisma.anomalyFlag.create({
    data: {
      tenantId: TEST_TENANT_ID,
      entityType: 'person',
      entityId: TEST_PERSON_ID,
      ruleId: 'dormant_spike',
      severity: 'alert',
      description: 'Account dormant for 90 days made 7 bookings in 24 hours',
      metadata: {},
      ...overrides,
    },
  })
}

describe.runIf(DB_AVAILABLE)('Anomalies API — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    await cleanAnomalies()
  })

  afterAll(async () => {
    await cleanAnomalies()
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/v1/anomalies')
    expect(res.status).toBe(401)
  })

  it('returns empty list when no flags exist', async () => {
    const res = await request.get('/v1/anomalies').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })

  it('lists unresolved flags by default', async () => {
    await seedFlag()
    await seedFlag({ resolvedAt: new Date(), ruleId: 'court_hoarding', severity: 'warning' })

    const res = await request.get('/v1/anomalies?unresolvedOnly=true').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].ruleId).toBe('dormant_spike')
  })

  it('filters by severity=alert', async () => {
    await seedFlag({ ruleId: 'dormant_spike', severity: 'alert' })
    await seedFlag({ ruleId: 'court_hoarding', severity: 'warning', entityId: 'other-entity' })

    const res = await request.get('/v1/anomalies?severity=alert').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data.every((f: any) => f.severity === 'alert')).toBe(true)
  })

  it('filters by severity=warning', async () => {
    await seedFlag({ ruleId: 'dormant_spike', severity: 'alert' })
    await seedFlag({ ruleId: 'court_hoarding', severity: 'warning', entityId: 'other-entity' })

    const res = await request.get('/v1/anomalies?severity=warning').set(HEADERS)
    expect(res.body.data.every((f: any) => f.severity === 'warning')).toBe(true)
  })

  it('POST /v1/anomalies/detect returns flagged count', async () => {
    const res = await request.post('/v1/anomalies/detect').set(HEADERS)
    expect(res.status).toBe(200)
    expect(typeof res.body.flagged).toBe('number')
  })

  it('PATCH /v1/anomalies/:id/resolve marks flag as resolved', async () => {
    const flag = await seedFlag()

    const res = await request.patch(`/v1/anomalies/${flag.id}/resolve`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.resolved).toBe(true)

    const listRes = await request.get('/v1/anomalies?unresolvedOnly=true').set(HEADERS)
    expect(listRes.body.data.find((f: any) => f.id === flag.id)).toBeUndefined()
  })

  it('resolved flags appear when unresolvedOnly=false', async () => {
    const flag = await seedFlag({ resolvedAt: new Date() })

    const res = await request.get('/v1/anomalies?unresolvedOnly=false').set(HEADERS)
    expect(res.body.data.find((f: any) => f.id === flag.id)).toBeDefined()
  })

  it('pagination respects page and limit', async () => {
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        seedFlag({ entityId: `e000000${i}-0000-4000-8000-000000000001`, ruleId: 'dormant_spike' }),
      ),
    )

    const res = await request.get('/v1/anomalies?page=1&limit=2').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(5)
  })

  it('tenant isolation — tenant B cannot see tenant A flags', async () => {
    await seedFlag()

    const res = await request.get('/v1/anomalies').set(HEADERS_B)
    expect(res.body.data).toHaveLength(0)
  })
})
