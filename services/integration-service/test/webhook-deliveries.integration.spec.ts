import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import { prisma, checkDbAvailable, cleanAll } from './helpers/db.js'
import { TEST_TENANT_ID, TEST_NONEXISTENT_ID } from './fixtures/index.js'

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

// The inbound event bus receiver is service-to-service authenticated via
// X-Internal-Secret (InternalSecretGuard). Ensure the secret is set and echoed.
process.env['INTERNAL_SECRET'] ??= 'test-internal-secret'
const INBOUND_HEADERS = {
  'content-type': 'application/json',
  'x-internal-secret': process.env['INTERNAL_SECRET'],
}

/**
 * Wait until `check` returns a non-empty result, or give up.
 *
 * Inbound events dispatch asynchronously, so these tests must wait for delivery
 * rows to appear. They used fixed 200-300ms sleeps — ample against a local
 * Postgres, not ample against remote Supabase. The suite passed locally and
 * failed against the shared database, which is a property of the sleep, not the
 * code under test.
 *
 * Polling adapts to whatever the run is pointed at: fast locally, patient
 * remotely.
 */
async function waitFor<T>(
  check: () => Promise<T>,
  { timeoutMs = 10_000, intervalMs = 100 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let last = await check()
  while (Array.isArray(last) && last.length === 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs))
    last = await check()
  }
  return last
}

const DB_AVAILABLE = await checkDbAvailable()

async function createSubscription(
  request: ReturnType<typeof supertest>,
  overrides: Record<string, unknown> = {},
) {
  const res = await request
    .post('/v1/webhook-subscriptions')
    .set(JSON_HEADERS)
    .send({
      name: 'Test Sub',
      endpointUrl: 'https://example.com/webhook',
      eventTypes: ['booking.confirmed', 'booking.cancelled'],
      ...overrides,
    })
  return res.body
}

describe.runIf(DB_AVAILABLE)('Webhook Deliveries — integration', () => {
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

  it('inbound event returns { received: true }', async () => {
    const res = await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })

    expect(res.status).toBe(201)
    expect(res.body.received).toBe(true)
  })

  it('inbound event creates delivery rows for matching active subscriptions', async () => {
    const sub = await createSubscription(request)

    // Assert the POST was accepted. Without this, a rejected request (the
    // internal-secret guard refusing it, say) is indistinguishable from "no rows
    // were created" — which is exactly how this failed silently once.
    const inbound = await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })
    expect(inbound.status).toBeLessThan(300)

    const deliveries = await waitFor(() =>
      prisma.webhookDelivery.findMany({ where: { subscriptionId: sub.id } }),
    )
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0].eventType).toBe('booking.confirmed')
    // Status is deliberately NOT asserted. A @Cron worker runs every 30s and
    // moves pending -> failed/delivered/dead; the subscription URL here is
    // unreachable, so a run landing mid-test flips it to 'failed'. That made this
    // suite intermittently red in CI while passing locally. What this test is
    // actually about is that a delivery row is CREATED for a matching
    // subscription — the worker's behaviour is covered by its own tests.
    expect(deliveries[0].subscriptionId).toBe(sub.id)
  })

  it('inbound event does not create deliveries for non-matching event type', async () => {
    const sub = await createSubscription(request, { eventTypes: ['membership.activated'] })

    await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })

    const deliveries = await waitFor(() =>
      prisma.webhookDelivery.findMany({ where: { subscriptionId: sub.id } }),
    )
    expect(deliveries).toHaveLength(0)
  })

  it('inbound event does not create deliveries for inactive subscriptions', async () => {
    const sub = await createSubscription(request)
    await request
      .patch(`/v1/webhook-subscriptions/${sub.id}`)
      .set(JSON_HEADERS)
      .send({ isActive: false })

    await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })

    const deliveries = await waitFor(() =>
      prisma.webhookDelivery.findMany({ where: { subscriptionId: sub.id } }),
    )
    expect(deliveries).toHaveLength(0)
  })

  it('fans out to multiple matching subscriptions', async () => {
    const sub1 = await createSubscription(request, { name: 'Sub 1' })
    const sub2 = await createSubscription(request, { name: 'Sub 2' })

    await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })

    const d1 = await waitFor(() =>
      prisma.webhookDelivery.findMany({ where: { subscriptionId: sub1.id } }),
    )
    const d2 = await waitFor(() =>
      prisma.webhookDelivery.findMany({ where: { subscriptionId: sub2.id } }),
    )
    expect(d1).toHaveLength(1)
    expect(d2).toHaveLength(1)
  })

  it('lists deliveries by subscriptionId with pagination', async () => {
    const sub = await createSubscription(request)
    await request.post('/v1/events/inbound').set(INBOUND_HEADERS).send({
      type: 'booking.confirmed',
      tenantId: TEST_TENANT_ID,
      occurredAt: new Date().toISOString(),
    })

    // Wait for the row to exist before reading it back through the API.
    await waitFor(() => prisma.webhookDelivery.findMany({ where: { subscriptionId: sub.id } }))

    const res = await request.get(`/v1/webhook-deliveries?subscriptionId=${sub.id}`).set(HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination.total).toBe(1)
    expect(res.body.data[0].eventType).toBe('booking.confirmed')
    // Not asserting status — see the note above; the delivery worker owns it.
    // The subscription filter is proven by the pagination total of exactly 1
    // (this subscription's delivery, and no other's).
    expect(res.body.data[0].id).toBeTruthy()
  })

  it('manual retry resets status to pending and attempts to 0', async () => {
    const sub = await createSubscription(request)

    // Create a delivery directly in dead state via raw SQL (bypasses relation requirement)
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO integration.webhook_deliveries (subscription_id, event_type, payload, status, attempts)
       VALUES ('${sub.id}'::uuid, 'booking.confirmed', '{}', 'dead', 5) RETURNING id`,
    )
    const delivery = { id: rows[0].id }

    const res = await request.post(`/v1/webhook-deliveries/${delivery.id}/retry`).set(HEADERS)
    expect(res.status).toBe(200)

    const updated = await prisma.webhookDelivery.findUnique({ where: { id: delivery.id } })
    expect(updated?.status).toBe('pending')
    expect(updated?.attempts).toBe(0)
  })

  it('returns 404 on retry of non-existent delivery', async () => {
    const res = await request
      .post(`/v1/webhook-deliveries/${TEST_NONEXISTENT_ID}/retry`)
      .set(HEADERS)
    expect(res.status).toBe(404)
  })
})
