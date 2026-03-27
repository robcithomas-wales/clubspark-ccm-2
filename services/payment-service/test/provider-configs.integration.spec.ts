import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID, FAKE_STRIPE_CREDENTIALS } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Provider Configs — integration', () => {
  let request: ReturnType<typeof supertest>

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

  it('returns empty list when no configs exist', async () => {
    const res = await request.get('/provider-configs').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('creates a Stripe provider config via PUT', async () => {
    const res = await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({
        provider: 'stripe',
        currency: 'GBP',
        isDefault: true,
        credentials: FAKE_STRIPE_CREDENTIALS,
      })

    expect(res.status).toBe(200)
    expect(res.body.data.provider).toBe('stripe')
    expect(res.body.data.currency).toBe('GBP')
    expect(res.body.data.isDefault).toBe(true)
    // Credentials must be redacted in responses
    expect(res.body.data.credentials).toBe('[redacted]')
  })

  it('returns the config in the list after creation', async () => {
    await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', credentials: FAKE_STRIPE_CREDENTIALS })

    const res = await request.get('/provider-configs').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].provider).toBe('stripe')
    expect(res.body.data[0].credentials).toBe('[redacted]')
  })

  it('upserts — updating credentials does not create a duplicate', async () => {
    await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', credentials: FAKE_STRIPE_CREDENTIALS })

    // Put again with different credentials
    await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', credentials: { ...FAKE_STRIPE_CREDENTIALS, secretKey: 'sk_test_updated' } })

    const res = await request.get('/provider-configs').set(HEADERS)
    expect(res.status).toBe(200)
    // Still only one config
    expect(res.body.data).toHaveLength(1)
  })

  it('setting a new default clears the old one', async () => {
    // Create GBP Stripe config as default
    await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', currency: 'GBP', isDefault: true, credentials: FAKE_STRIPE_CREDENTIALS })

    // Create EUR GoCardless config as default for EUR — should not affect GBP default
    await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'gocardless', currency: 'EUR', isDefault: true, credentials: { accessToken: 'tok', webhookSecret: 'sec' } })

    const res = await request.get('/provider-configs').set(HEADERS)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('deactivates a config on DELETE', async () => {
    const putRes = await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe', credentials: FAKE_STRIPE_CREDENTIALS })

    const id = putRes.body.data.id

    const delRes = await request.delete(`/provider-configs/${id}`).set(HEADERS)
    expect(delRes.status).toBe(200)

    // Should no longer appear in list (isActive = false filtered out)
    const listRes = await request.get('/provider-configs').set(HEADERS)
    expect(listRes.body.data).toHaveLength(0)
  })

  it('returns 401 without tenant header', async () => {
    const res = await request.get('/provider-configs')
    expect(res.status).toBe(401)
  })

  it('returns 400 when required credentials fields are missing', async () => {
    const res = await request
      .put('/provider-configs')
      .set(JSON_HEADERS)
      .send({ provider: 'stripe' }) // missing credentials
    expect(res.status).toBe(400)
  })

  it('returns 404 when deleting a non-existent config', async () => {
    const res = await request.delete(`/provider-configs/${TEST_NONEXISTENT_ID}`).set(HEADERS)
    expect(res.status).toBe(404)
  })
})
