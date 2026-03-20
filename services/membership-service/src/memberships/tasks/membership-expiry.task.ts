import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { MembershipsRepository } from '../memberships.repository'

/**
 * Runs daily at midnight (00:05 to avoid exact midnight contention) and:
 *   1. Lapses all active/suspended memberships whose endDate has passed.
 *   2. Expires all lapsed memberships that have also passed their plan's grace period.
 *
 * Both transitions write MembershipLifecycleEvent rows for full auditability.
 */
@Injectable()
export class MembershipExpiryTask {
  private readonly logger = new Logger(MembershipExpiryTask.name)

  constructor(private readonly repo: MembershipsRepository) {}

  @Cron('5 0 * * *') // 00:05 every day
  async runDailyExpiry() {
    const now = new Date()

    const lapsed = await this.repo.lapseExpired(now)
    if (lapsed > 0) {
      this.logger.log({ count: lapsed }, 'Auto-lapsed expired memberships')
    }

    const expired = await this.repo.expireLapsed(now)
    if (expired > 0) {
      this.logger.log({ count: expired }, 'Auto-expired lapsed memberships past grace period')
    }

    // Queue pending renewal memberships for autoRenew=true members expiring within 7 days
    const renewed = await this.repo.createAutoRenewals(now, 7)
    if (renewed > 0) {
      this.logger.log({ count: renewed }, 'Auto-renewal memberships queued')
    }
  }
}
