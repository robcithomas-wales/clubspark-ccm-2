import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { BookingsRepository } from '../bookings.repository.js'
import { OutboxRepository } from '../../outbox/outbox.repository.js'
import { PeopleClient } from '../../people/people.client.js'
import { VenueClient } from '../../venue/venue.client.js'

/**
 * Runs every hour and publishes `booking.reminder_due` events for every
 * active/pending booking that starts in the 23–25 h window ahead and
 * has not yet had a reminder sent.
 *
 * The 2-hour window ensures the cron never misses a booking between runs
 * (hourly cadence + 2 h window = 100 % coverage), while `reminder_sent_at`
 * prevents duplicates even if the process restarts mid-window.
 */
@Injectable()
export class BookingReminderTask {
  private readonly logger = new Logger(BookingReminderTask.name)

  constructor(
    private readonly repo: BookingsRepository,
    private readonly outbox: OutboxRepository,
    private readonly people: PeopleClient,
    private readonly venue: VenueClient,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders() {
    let bookings: Awaited<ReturnType<BookingsRepository['findDueReminders']>>
    try {
      bookings = await this.repo.findDueReminders()
    } catch (err) {
      // Never let the lookup reject unhandled — an unhandled rejection here is
      // silent, and a broken query would stop reminders indefinitely unnoticed.
      this.logger.error({ err: String(err) }, 'Failed to load bookings due for reminder')
      return
    }

    if (bookings.length === 0) return

    this.logger.log({ count: bookings.length }, 'Sending booking reminders')

    // Customer name/email come from people-service, not a SQL join — booking can
    // no longer read people.persons (MR-1). Reminders group by tenant because the
    // batch lookup is tenant-scoped; the cron spans all tenants.
    const byTenant = new Map<string, typeof bookings>()
    for (const b of bookings) {
      const list = byTenant.get(b.tenantId) ?? []
      list.push(b)
      byTenant.set(b.tenantId, list)
    }
    const customers = new Map<string, Awaited<ReturnType<PeopleClient['getDisplayFields']>>>()
    const venues = new Map<
      string,
      Map<string, { venueName: string | null; resourceName: string | null }>
    >()
    for (const [tenantId, rows] of byTenant) {
      customers.set(
        tenantId,
        await this.people.getDisplayFields(
          tenantId,
          rows.map((r) => r.customerId),
        ),
      )
      // Venue names via venue-service too (MR-3) — booking no longer joins venue.*.
      const hydrated = await this.venue.hydrate(tenantId, rows)
      venues.set(
        tenantId,
        new Map(
          hydrated.map((h) => [h.id, { venueName: h.venueName, resourceName: h.resourceName }]),
        ),
      )
    }

    for (const b of bookings) {
      const person = b.customerId ? customers.get(b.tenantId)?.get(b.customerId) : undefined
      const place = venues.get(b.tenantId)?.get(b.id)
      try {
        const event = {
          type: 'booking.reminder_due',
          tenantId: b.tenantId,
          occurredAt: new Date().toISOString(),
          bookingId: b.id,
          bookingReference: b.bookingReference,
          customerId: b.customerId,
          customerEmail: person?.customerEmail ?? null,
          customerFirstName: person?.customerFirstName ?? null,
          customerLastName: person?.customerLastName ?? null,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          venueName: place?.venueName ?? null,
          resourceName: place?.resourceName ?? null,
        } as const
        const queued = await this.repo.queueReminder(b.id, (tx) => this.outbox.enqueue(tx, event))
        if (!queued) {
          this.logger.debug({ bookingId: b.id }, 'Reminder already claimed by another replica')
        }
      } catch (err) {
        // Log and continue — a failure for one booking must not block others
        this.logger.error(
          { bookingId: b.id, err: String(err) },
          'Failed to send reminder for booking',
        )
      }
    }
  }
}
