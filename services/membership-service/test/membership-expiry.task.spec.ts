import { describe, expect, it, vi } from 'vitest'
import { MembershipExpiryTask } from '../src/memberships/tasks/membership-expiry.task'

describe('MembershipExpiryTask singleton safety', () => {
  it('allows only the runner holding the lease to execute the daily batch', async () => {
    const lease = { jobName: 'membership-daily-expiry', ownerId: 'owner-1' }
    const leases = {
      tryAcquire: vi.fn().mockResolvedValueOnce(lease).mockResolvedValueOnce(null),
      release: vi.fn().mockResolvedValue(undefined),
    }
    const repo = {
      lapseExpired: vi.fn().mockResolvedValue(0),
      expireLapsed: vi.fn().mockResolvedValue(0),
      createAutoRenewals: vi.fn().mockResolvedValue(0),
      findDueRenewalReminders: vi.fn().mockResolvedValue([]),
    }
    const task = new MembershipExpiryTask(repo as never, {} as never, leases as never)

    await Promise.all([task.runDailyExpiry(), task.runDailyExpiry()])

    expect(repo.lapseExpired).toHaveBeenCalledTimes(1)
    expect(repo.expireLapsed).toHaveBeenCalledTimes(1)
    expect(repo.createAutoRenewals).toHaveBeenCalledTimes(1)
    expect(leases.release).toHaveBeenCalledWith(lease)
  })
})
