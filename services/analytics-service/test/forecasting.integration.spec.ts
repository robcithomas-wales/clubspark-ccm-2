import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanForecasts } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const HEADERS_B = { 'x-tenant-id': TEST_TENANT_ID_B }

const UNIT_ID = 'f0000000-0000-4000-8000-000000000001'

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Forecasting API — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    await cleanForecasts()
  })

  afterAll(async () => {
    await cleanForecasts()
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/v1/forecasts/dead-slots')
    expect(res.status).toBe(401)
  })

  it('returns empty array when no forecasts computed', async () => {
    const res = await request.get('/v1/forecasts/dead-slots').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('GET /v1/forecasts returns empty array when no forecast slots exist', async () => {
    const res = await request.get('/v1/forecasts').set(HEADERS)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(0)
  })

  it('stores and retrieves a forecast slot', async () => {
    const forecastDate = new Date()
    forecastDate.setDate(forecastDate.getDate() + 5)
    await prisma.forecastSlot.create({
      data: {
        tenantId: TEST_TENANT_ID,
        unitId: UNIT_ID,
        forecastDate,
        hourSlot: 10,
        predictedOccupancy: 0.8,
        historicalWeeks: 4,
        isDeadSlot: false,
      },
    })

    const res = await request.get('/v1/forecasts').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    const slot = res.body.find((s: any) => s.unitId === UNIT_ID && s.hourSlot === 10)
    expect(slot).toBeDefined()
    expect(slot.predictedOccupancy).toBeCloseTo(0.8)
  })

  it('GET /v1/forecasts/dead-slots groups by unit and includes deadSlotCount', async () => {
    const base = new Date()
    base.setDate(base.getDate() + 4)
    await prisma.forecastSlot.createMany({
      data: [
        { tenantId: TEST_TENANT_ID, unitId: UNIT_ID, forecastDate: new Date(base), hourSlot: 8,  predictedOccupancy: 0.10, historicalWeeks: 4, isDeadSlot: true },
        { tenantId: TEST_TENANT_ID, unitId: UNIT_ID, forecastDate: new Date(base), hourSlot: 9,  predictedOccupancy: 0.20, historicalWeeks: 4, isDeadSlot: true },
        { tenantId: TEST_TENANT_ID, unitId: UNIT_ID, forecastDate: new Date(base), hourSlot: 10, predictedOccupancy: 0.90, historicalWeeks: 4, isDeadSlot: false },
      ],
    })

    const res = await request.get('/v1/forecasts/dead-slots').set(HEADERS)
    expect(res.status).toBe(200)
    const unit = res.body.find((u: any) => u.unitId === UNIT_ID)
    expect(unit).toBeDefined()
    expect(unit.deadSlotCount).toBeGreaterThanOrEqual(2)
    expect(unit.lowestOccupancy).toBeCloseTo(0.10)
  })

  it('POST /v1/forecasts/compute returns slotsComputed and deadSlots', async () => {
    const res = await request.post('/v1/forecasts/compute').set(HEADERS)
    expect(res.status).toBe(200)
    expect(typeof res.body.slotsComputed).toBe('number')
    expect(typeof res.body.deadSlots).toBe('number')
  })

  it('dead-slots bookers endpoint returns array', async () => {
    const res = await request.get(`/v1/forecasts/dead-slots/${UNIT_ID}/bookers`).set(HEADERS)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('tenant isolation — tenant B cannot see tenant A forecast slots', async () => {
    const forecastDate = new Date()
    forecastDate.setDate(forecastDate.getDate() + 5)
    await prisma.forecastSlot.create({
      data: {
        tenantId: TEST_TENANT_ID,
        unitId: UNIT_ID,
        forecastDate,
        hourSlot: 10,
        predictedOccupancy: 0.1,
        historicalWeeks: 4,
        isDeadSlot: true,
      },
    })

    const res = await request.get('/v1/forecasts').set(HEADERS_B)
    expect(res.status).toBe(200)
    expect(res.body.filter((s: any) => s.unitId === UNIT_ID)).toHaveLength(0)
  })

  it('GET /v1/forecasts deadSlotsOnly=true filters correctly', async () => {
    const base = new Date()
    base.setDate(base.getDate() + 5)
    await prisma.forecastSlot.createMany({
      data: [
        { tenantId: TEST_TENANT_ID, unitId: UNIT_ID, forecastDate: new Date(base), hourSlot: 8, predictedOccupancy: 0.1, historicalWeeks: 4, isDeadSlot: true },
        { tenantId: TEST_TENANT_ID, unitId: UNIT_ID, forecastDate: new Date(base), hourSlot: 9, predictedOccupancy: 0.9, historicalWeeks: 4, isDeadSlot: false },
      ],
    })

    const res = await request.get('/v1/forecasts?deadSlotsOnly=true').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.every((s: any) => s.isDeadSlot === true)).toBe(true)
  })
})
