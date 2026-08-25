import { describe, expect, it, vi } from 'vitest'
import { JobLeaseService } from '../src/scheduled-jobs/job-lease.service.js'
import { ScoringService } from '../src/scoring/scoring.service.js'

describe('scheduled job leases', () => {
  it('returns no lease when the conditional database claim loses', async () => {
    const write = {
      $queryRaw: vi.fn().mockResolvedValue([]),
    }
    const leases = new JobLeaseService({ write } as never)

    await expect(leases.tryAcquire('member-scoring', 60)).resolves.toBeNull()
  })

  it('allows only the runner holding the lease to start a singleton batch', async () => {
    const lease = { jobName: 'member-scoring', ownerId: 'owner-1' }
    const leases = {
      tryAcquire: vi.fn().mockResolvedValueOnce(lease).mockResolvedValueOnce(null),
      release: vi.fn().mockResolvedValue(undefined),
    }
    const repo = {
      getActiveTenantIds: vi.fn().mockResolvedValue([]),
    }
    const service = new ScoringService(repo as never, leases as never)

    await Promise.all([service.batchScoreAllTenants(), service.batchScoreAllTenants()])

    expect(repo.getActiveTenantIds).toHaveBeenCalledTimes(1)
    expect(leases.release).toHaveBeenCalledOnce()
    expect(leases.release).toHaveBeenCalledWith(lease)
  })
})
