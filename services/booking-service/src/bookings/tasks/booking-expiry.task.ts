import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { BookingsRepository } from '../bookings.repository.js'

/**
 * Runs every hour and cancels any pending bookings that have been waiting
 * for admin approval for more than EXPIRY_HOURS (default 24 h).
 *
 * This prevents the pending queue from growing unbounded and ensures
 * customers are not left in an unresolved state indefinitely.
 */
@Injectable()
export class BookingExpiryTask {
  private readonly logger = new Logger(BookingExpiryTask.name)
  private readonly EXPIRY_HOURS = 24

  constructor(private readonly repo: BookingsRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingBookings() {
    const count = await this.repo.expirePending(this.EXPIRY_HOURS)
    if (count > 0) {
      this.logger.log(
        { count, expiryHours: this.EXPIRY_HOURS },
        'Auto-expired pending bookings',
      )
    }
  }
}
