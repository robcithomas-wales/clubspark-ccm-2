import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { BookingsRepository } from '../bookings.repository.js'
import { EventBusService } from '../../event-bus/event-bus.service.js'

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
    private readonly eventBus: EventBusService,
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

    for (const b of bookings) {
      try {
        await this.eventBus.publish({
          type: 'booking.reminder_due',
          tenantId: b.tenantId,
          occurredAt: new Date().toISOString(),
          bookingId: b.id,
          bookingReference: b.bookingReference,
          customerId: b.customerId,
          customerEmail: b.customerEmail,
          customerFirstName: b.customerFirstName,
          customerLastName: b.customerLastName,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          venueName: b.venueName,
          resourceName: b.resourceName,
        })
        await this.repo.markReminderSent(b.id)
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
