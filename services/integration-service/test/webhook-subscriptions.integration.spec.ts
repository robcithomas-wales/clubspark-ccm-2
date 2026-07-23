import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_TENANT_ID_B, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const VALID_PAYLOAD = {
  name: 'Booking Feed',
  endpointUrl: 'https://ngb.example.com/webhooks',
  eventTypes: ['booking.confirmed', 'booking.cancelled'],
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Webhook Subscriptions — integration', () => {
  let request: ReturnType<typeof supertest>

  beforeAll(async () => {
    const app = await getApp()
    request = supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
  })

  afterEach(async () => {
    await cleanAll()
  })

  afterAll(async () => {
    await cleanAll()
    await prisma.$disconnect()
    await closeApp()
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/v1/webhook-subscriptions')
    expect(res.status).toBe(401)
  })

  it('returns empty list when no subscriptions exist', async () => {
    const res = await request.get('/v1/webhook-subscriptions').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('creates a subscription and returns signing secret once', async () => {
    const res = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)

    expect(res.status).toBe(201)
    expect(res.body.secret).toHaveLength(64)
    expect(res.body.id).toBeDefined()
    expect(res.body.name).toBe('Booking Feed')
    expect(res.body.endpointUrl).toBe(VALID_PAYLOAD.endpointUrl)
    expect(res.body.eventTypes).toEqual(VALID_PAYLOAD.eventTypes)
    expect(res.body.isActive).toBe(true)
  })

  it('stores secret hash, not plaintext', async () => {
    const res = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)

    const row = await prisma.webhookSubscription.findUnique({ where: { id: res.body.id } })
    expect(row?.secretHash).not.toBe(res.body.secret)
    expect(row?.secretHash).toHaveLength(64)
  })

  it('lists subscriptions without secret', async () => {
    await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)

    const res = await request.get('/v1/webhook-subscriptions').set(HEADERS)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].secret).toBeUndefined()
    expect(res.body.data[0].secretHash).toBeUndefined()
  })

  it('updates endpoint URL', async () => {
    const createRes = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)
    const id = createRes.body.id

    const updateRes = await request
      .patch(`/v1/webhook-subscriptions/${id}`)
      .set(JSON_HEADERS)
      .send({ endpointUrl: 'https://ngb.example.com/webhooks/v2' })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.endpointUrl).toBe('https://ngb.example.com/webhooks/v2')
  })

  it('updates event types', async () => {
    const createRes = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)
    const id = createRes.body.id

    const updateRes = await request
      .patch(`/v1/webhook-subscriptions/${id}`)
      .set(JSON_HEADERS)
      .send({ eventTypes: ['membership.activated'] })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.eventTypes).toEqual(['membership.activated'])
  })

  it('deactivates a subscription', async () => {
    const createRes = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)
    const id = createRes.body.id

    await request.patch(`/v1/webhook-subscriptions/${id}`).set(JSON_HEADERS).send({ isActive: false })

    const listRes = await request.get('/v1/webhook-subscriptions').set(HEADERS)
    expect(listRes.body.data[0].isActive).toBe(false)
  })

  it('deletes a subscription', async () => {
    const createRes = await request.post('/v1/webhook-subscriptions').set(JSON_HEADERS).send(VALID_PAYLOAD)
    const id = createRes.body.id

    const deleteRes = await request.delete(`/v1/webhook-subscriptions/${id}`).set(HEADERS)
    expect(deleteRes.status).toBe(200)

    const listRes = await request.get('/v1/webhook-subscriptions').set(HEADERS)
    expect(listRes.body.data).toHaveLength(0)
  })

  it('returns 404 on update of non-existent subscription', async () => {
    const res = await request
      .patch(`/v1/webhook-subscriptions/${TEST_NONEXISTENT_ID}`)
      .set(JSON_HEADERS)
      .send({ isActive: false })
    expect(res.status).toBe(404)
  })

  it('enforces cross-tenant isolation', async () => {
    await request
      .post('/v1/webhook-subscriptions')
      .set({ 'x-tenant-id': TEST_TENANT_ID_B, 'content-type': 'application/json' })
      .send({ ...VALID_PAYLOAD, name: 'Tenant B Sub' })

    const res = await request.get('/v1/webhook-subscriptions').set(HEADERS)
    expect(res.body.data).toHaveLength(0)
  })

  it('rejects invalid event type', async () => {
    const res = await request
      .post('/v1/webhook-subscriptions')
      .set(JSON_HEADERS)
      .send({ ...VALID_PAYLOAD, eventTypes: ['invalid.event'] })
    expect(res.status).toBe(400)
  })
})
