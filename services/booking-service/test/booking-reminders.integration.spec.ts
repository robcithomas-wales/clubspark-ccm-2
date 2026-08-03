import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
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
import { BookingsRepository } from '../src/bookings/bookings.repository.js'
import { BookingReminderTask } from '../src/bookings/tasks/booking-reminder.task.js'
import { EventBusService } from '../src/event-bus/event-bus.service.js'
import { PeopleClient } from '../src/people/people.client.js'

/**
 * Regression suite for the booking-reminder cron.
 *
 * Guards the bug found in WO-1.0: `findDueReminders()` joined `people.people`,
 * a table that does not exist (people-service maps its model to `persons`), so
 * the query threw on every hourly run and no reminder was ever sent. The task
 * awaited the lookup outside its try/catch, so the failure surfaced only as an
 * unhandled rejection.
 *
 * These tests therefore assert two separate things:
 *   1. the query actually executes against the real schema (the typo class of bug), and
 *   2. the task survives a lookup failure instead of rejecting (the silence class of bug).
 */

const TEST_PERSON_ID = '10000000-0000-4000-8000-000000000021'

/** Inside findDueReminders' 23–25 h window. */
function inReminderWindow(): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  return { startsAt, endsAt }
}

async function seedPerson(): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO people.persons (id, tenant_id, first_name, last_name, email, phone)
    VALUES (
      ${TEST_PERSON_ID}::uuid, ${TEST_TENANT_ID}::uuid,
      'Reminder', 'Recipient', 'reminder@example.test', '07000000000'
    )
    ON CONFLICT (id) DO NOTHING
  `
}

async function cleanPerson(): Promise<void> {
  await prisma.$executeRaw`DELETE FROM people.persons WHERE id = ${TEST_PERSON_ID}::uuid`
}

async function insertBooking(opts: {
  startsAt: Date
  endsAt: Date
  status?: string
  reminderSentAt?: Date | null
  customerId?: string | null
}): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO booking.bookings (
      tenant_id, organisation_id, venue_id, resource_id, bookable_unit_id,
      customer_id, starts_at, ends_at, status, booking_reference, reminder_sent_at
    )
    VALUES (
      ${TEST_TENANT_ID}::uuid, ${TEST_ORG_ID}::uuid, ${TEST_VENUE_ID}::uuid,
      ${TEST_RESOURCE_ID}::uuid, ${TEST_UNIT_ID}::uuid,
      ${opts.customerId ?? TEST_PERSON_ID}::uuid,
      ${opts.startsAt}::timestamptz, ${opts.endsAt}::timestamptz,
      ${opts.status ?? 'active'},
      ${'REM-' + Math.floor(opts.startsAt.getTime() % 1_000_000).toString()},
      ${opts.reminderSentAt ?? null}::timestamptz
    )
    RETURNING id::text AS id
  `
  return rows[0]!.id
}

const DB_AVAILABLE = await checkDbAvailable()

describe.runIf(DB_AVAILABLE)('Booking reminders — cron regression', () => {
  let repo: BookingsRepository
  let task: BookingReminderTask
  let eventBus: EventBusService
  let people: PeopleClient

  beforeAll(async () => {
    await seedFixtures()
    await seedPerson()
    const app = await getApp()
    repo = app.get(BookingsRepository)
    task = app.get(BookingReminderTask)
    eventBus = app.get(EventBusService)
    people = app.get(PeopleClient)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanBookings()
  })

  afterAll(async () => {
    await cleanPerson()
    await teardownFixtures()
    await prisma.$disconnect()
    await closeApp()
  })

  it('findDueReminders executes against the real schema without throwing', async () => {
    // The original bug: this rejected with `relation "people.people" does not exist`.
    await expect(repo.findDueReminders()).resolves.toBeInstanceOf(Array)
  })

  it('returns a booking in the 23–25h window, without reaching into people.persons', async () => {
    const { startsAt, endsAt } = inReminderWindow()
    const id = await insertBooking({ startsAt, endsAt })

    const due = await repo.findDueReminders()
    const row = due.find((b) => b.id === id)

    expect(row).toBeDefined()
    // Customer identity is deliberately NOT selected here any more (MR-1): booking
    // cannot read people.persons, so the task hydrates via people-service instead.
    // The row carries the id to hydrate with, and booking's own columns.
    expect(row!.customerId).toBe(TEST_PERSON_ID)
    // Neither customer nor venue identity is selected here any more (MR-1, MR-3):
    // booking reads neither people.* nor venue.*. The row carries the ids to
    // hydrate with; the task fetches the names from the owning services.
    expect(row).not.toHaveProperty('customerEmail')
    expect(row).not.toHaveProperty('venueName')
    expect(row!.venueId).toBe(TEST_VENUE_ID)
    expect(row!.resourceId).toBe(TEST_RESOURCE_ID)
  })

  it('excludes bookings outside the window, cancelled bookings, and already-reminded bookings', async () => {
    const { startsAt, endsAt } = inReminderWindow()

    const tooFar = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const outOfWindowId = await insertBooking({
      startsAt: tooFar,
      endsAt: new Date(tooFar.getTime() + 60 * 60 * 1000),
    })
    const cancelledId = await insertBooking({ startsAt, endsAt, status: 'cancelled' })
    const alreadySentId = await insertBooking({ startsAt, endsAt, reminderSentAt: new Date() })

    const dueIds = (await repo.findDueReminders()).map((b) => b.id)

    expect(dueIds).not.toContain(outOfWindowId)
    expect(dueIds).not.toContain(cancelledId)
    expect(dueIds).not.toContain(alreadySentId)
  })

  it('the cron publishes booking.reminder_due and stamps reminder_sent_at exactly once', async () => {
    const { startsAt, endsAt } = inReminderWindow()
    const id = await insertBooking({ startsAt, endsAt })

    const publish = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as never)

    await task.sendReminders()

    const published = publish.mock.calls
      .map(([e]) => e as { type: string; bookingId?: string })
      .filter((e) => e.type === 'booking.reminder_due' && e.bookingId === id)
    expect(published).toHaveLength(1)

    const [after] = await prisma.$queryRaw<{ reminderSentAt: Date | null }[]>`
      SELECT reminder_sent_at AS "reminderSentAt" FROM booking.bookings WHERE id = ${id}::uuid
    `
    expect(after!.reminderSentAt).not.toBeNull()

    // Second run must be a no-op — reminder_sent_at now guards it.
    publish.mockClear()
    await task.sendReminders()
    expect(
      publish.mock.calls.filter(([e]) => (e as { bookingId?: string }).bookingId === id),
    ).toHaveLength(0)
  })

  /**
   * MR-1: customer identity now comes from people-service, not a SQL join. The
   * cron must attach it to the published event — otherwise reminders go out with
   * no recipient, which is exactly the silent failure this suite exists to catch.
   */
  it('the cron hydrates customer details from people-service before publishing', async () => {
    const { startsAt, endsAt } = inReminderWindow()
    const id = await insertBooking({ startsAt, endsAt })

    vi.spyOn(people, 'getDisplayFields').mockResolvedValue(
      new Map([
        [
          TEST_PERSON_ID,
          {
            customerFirstName: 'Reminder',
            customerLastName: 'Recipient',
            customerEmail: 'reminder@example.test',
            customerPhone: '07000000000',
          },
        ],
      ]),
    )
    const publish = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as never)

    await task.sendReminders()

    const event = publish.mock.calls
      .map(([e]) => e as Record<string, unknown>)
      .find((e) => e.bookingId === id)
    expect(event).toBeDefined()
    expect(event!.customerEmail).toBe('reminder@example.test')
    expect(event!.customerFirstName).toBe('Reminder')
  })

  it('still publishes when people-service is unreachable, with blank customer details', async () => {
    const { startsAt, endsAt } = inReminderWindow()
    const id = await insertBooking({ startsAt, endsAt })

    // A reminder with no name is better than no reminder and an unhandled error.
    vi.spyOn(people, 'getDisplayFields').mockResolvedValue(new Map())
    const publish = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as never)

    await task.sendReminders()

    const event = publish.mock.calls
      .map(([e]) => e as Record<string, unknown>)
      .find((e) => e.bookingId === id)
    expect(event).toBeDefined()
    expect(event!.customerEmail).toBeNull()
  })

  it('the cron swallows a lookup failure instead of rejecting unhandled', async () => {
    vi.spyOn(repo, 'findDueReminders').mockRejectedValue(new Error('relation does not exist'))

    // The original task awaited the lookup outside its try/catch, so this rejected.
    await expect(task.sendReminders()).resolves.toBeUndefined()
  })
})
