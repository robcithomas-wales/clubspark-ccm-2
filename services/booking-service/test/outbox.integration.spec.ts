import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import supertest from 'supertest'
import { getApp, closeApp } from './helpers/app.js'
import {
  prisma,
  seedFixtures,
  cleanBookings,
  teardownFixtures,
  checkDbAvailable,
} from './helpers/db.js'
import {
  TEST_TENANT_ID,
  TEST_ORG_ID,
  TEST_VENUE_ID,
  TEST_RESOURCE_ID,
  TEST_UNIT_ID,
} from './fixtures/index.js'
import { OutboxRelay } from '../src/outbox/outbox.relay.js'
import { EventBusService } from '../src/event-bus/event-bus.service.js'

/**
 * Transactional outbox (MR-2).
 *
 * Events used to be published with `void eventBus.publish(...)` — unawaited, with
 * every error swallowed. A subscriber being down meant the event was gone, with no
 * record it had existed. These tests pin the two properties that fix:
 *
 *   1. the event is written in the SAME transaction as the state change, so it
 *      cannot be lost after a commit and cannot be emitted for a rollback;
 *   2. delivery is retried until it succeeds, rather than attempted once.
 */

const HEADERS = { 'x-tenant-id': TEST_TENANT_ID, 'x-organisation-id': TEST_ORG_ID }
const JSON_HEADERS = { ...HEADERS, 'content-type': 'application/json' }

let slot = 0
function futureSlot() {
  const s = slot++
  return {
    startsAt: new Date(Date.UTC(2098, 0, 1, 6 + s, 0, 0)).toISOString(),
    endsAt: new Date(Date.UTC(2098, 0, 1, 7 + s, 0, 0)).toISOString(),
  }
}

async function outboxRows(type?: string) {
  return type
    ? prisma.$queryRaw<
        { id: string; eventType: string; publishedAt: Date | null; attempts: number }[]
      >`
        SELECT id::text, event_type AS "eventType", published_at AS "publishedAt", attempts
        FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid AND event_type = ${type}`
    : prisma.$queryRaw<
        { id: string; eventType: string; publishedAt: Date | null; attempts: number }[]
      >`
        SELECT id::text, event_type AS "eventType", published_at AS "publishedAt", attempts
        FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Transactional outbox', () => {
  let request: ReturnType<typeof supertest>
  let relay: OutboxRelay
  let eventBus: EventBusService

  beforeAll(async () => {
    await seedFixtures()
    const app = await getApp()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request = supertest(app.getHttpServer() as any)
    relay = app.get(OutboxRelay)
    eventBus = app.get(EventBusService)
    // Earlier suites in the same run leave their own outbox rows behind.
    await prisma.$executeRaw`DELETE FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanBookings()
    await prisma.$executeRaw`DELETE FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid`
  })

  afterAll(async () => {
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  it('records booking.confirmed in the same transaction as the booking', async () => {
    const res = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...futureSlot(),
      })
    expect(res.status).toBe(201)

    const rows = await outboxRows('booking.confirmed')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.publishedAt).toBeNull() // not yet delivered — that is the relay's job
  })

  /**
   * The property that makes this an outbox rather than a queue: a rolled-back
   * state change must not leave an event behind. A conflicting booking is
   * rejected, so nothing should be recorded.
   */
  it('records nothing when the state change is rejected', async () => {
    const slotUsed = futureSlot()
    const first = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...slotUsed,
      })
    expect(first.status).toBe(201)
    await prisma.$executeRaw`DELETE FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid`

    // Same slot — rejected by the exclusion constraint.
    const clash = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...slotUsed,
      })
    expect(clash.status).toBe(409)

    expect(await outboxRows()).toHaveLength(0)
  })

  it('the relay delivers a pending event and marks it published', async () => {
    await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...futureSlot(),
      })
    const publish = vi.spyOn(eventBus, 'publishDurably').mockResolvedValue(undefined)

    await relay.flush()

    expect(publish).toHaveBeenCalledTimes(1)
    const rows = await outboxRows('booking.confirmed')
    expect(rows[0]!.publishedAt).not.toBeNull()
  })

  /**
   * The whole point: a subscriber being unavailable must not lose the event.
   * Previously `void publish()` swallowed the error and the event was gone.
   */
  it('keeps the event and retries when delivery fails', async () => {
    await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...futureSlot(),
      })

    const publish = vi
      .spyOn(eventBus, 'publishDurably')
      .mockRejectedValue(new Error('subscriber down'))
    await relay.flush()

    const afterFailure = await outboxRows('booking.confirmed')
    expect(afterFailure[0]!.publishedAt).toBeNull() // still owed
    expect(afterFailure[0]!.attempts).toBe(1) // and counted

    // Backoff defers the retry, so clear it to simulate the wait elapsing.
    await prisma.$executeRaw`
      UPDATE booking.event_outbox SET next_attempt_at = now()
      WHERE tenant_id = ${TEST_TENANT_ID}::uuid`

    publish.mockResolvedValue(undefined)
    await relay.flush()

    const afterRecovery = await outboxRows('booking.confirmed')
    expect(afterRecovery[0]!.publishedAt).not.toBeNull()
  })

  it('backs off rather than retrying immediately', async () => {
    await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...futureSlot(),
      })
    const publish = vi.spyOn(eventBus, 'publishDurably').mockRejectedValue(new Error('down'))

    await relay.flush()
    await relay.flush() // immediately again — should be skipped by next_attempt_at

    expect(publish).toHaveBeenCalledTimes(1)
  })

  it('records booking.cancelled in the cancellation transaction', async () => {
    const created = await request
      .post('/bookings')
      .set(JSON_HEADERS)
      .send({
        venueId: TEST_VENUE_ID,
        resourceId: TEST_RESOURCE_ID,
        bookableUnitId: TEST_UNIT_ID,
        ...futureSlot(),
      })
    await prisma.$executeRaw`DELETE FROM booking.event_outbox WHERE tenant_id = ${TEST_TENANT_ID}::uuid`

    await request.post(`/bookings/${created.body.data.id}/cancel`).set(HEADERS).expect(200)

    const rows = await outboxRows('booking.cancelled')
    expect(rows).toHaveLength(1)
  })
})
