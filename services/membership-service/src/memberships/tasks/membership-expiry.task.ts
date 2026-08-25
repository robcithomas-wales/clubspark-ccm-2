import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MembershipsRepository } from '../memberships.repository'
import { OutboxRepository } from '../../outbox/outbox.repository'
import { JobLeaseService } from '../../scheduled-jobs/job-lease.service'

/**
 * Runs daily at midnight (00:05 to avoid exact midnight contention) and:
 *   1. Lapses all active/suspended memberships whose endDate has passed.
 *   2. Expires all lapsed memberships that have also passed their plan's grace period.
 *   3. Queues auto-renewals for members expiring within 7 days.
 *   4. Fires membership.renewal_due events for active memberships expiring in 6–8 days
 *      (window gives 1 retry day either side; renewalReminderSentAt stamp prevents duplicates).
 */
@Injectable()
export class MembershipExpiryTask {
  private readonly logger = new Logger(MembershipExpiryTask.name)

  constructor(
    private readonly repo: MembershipsRepository,
    private readonly outbox: OutboxRepository,
    private readonly leases: JobLeaseService,
  ) {}

  @Cron('5 0 * * *') // 00:05 every day
  async runDailyExpiry() {
    const lease = await this.leases.tryAcquire('membership-daily-expiry', 6 * 60 * 60)
    if (!lease) {
      this.logger.log('Membership daily expiry skipped; another replica owns the lease')
      return
    }
    try {
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

      // Fire renewal reminder events for memberships expiring in 6–8 days
      await this.sendRenewalReminders()
    } finally {
      await this.leases.release(lease)
    }
  }

  private async sendRenewalReminders(): Promise<void> {
    const due = await this.repo.findDueRenewalReminders(6, 8)
    if (due.length === 0) return

    this.logger.log({ count: due.length }, 'Sending renewal reminder events')

    for (const m of due) {
      try {
        const event = {
          type: 'membership.renewal_due',
          tenantId: m.tenantId,
          occurredAt: new Date().toISOString(),
          membershipId: m.id,
          customerId: m.customerId,
          planName: m.planName,
          endDate: m.endDate?.toISOString().slice(0, 10) ?? null,
        } as const
        const queued = await this.repo.queueRenewalReminder(m.id, (tx) =>
          this.outbox.enqueue(tx, event),
        )
        if (!queued) {
          this.logger.debug(`Renewal reminder ${m.id} already claimed by another replica`)
        }
      } catch (err) {
        this.logger.error(`Failed to send renewal reminder for membership ${m.id}: ${String(err)}`)
      }
    }
  }
}
