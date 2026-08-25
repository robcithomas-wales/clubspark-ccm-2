import { describe, expect, it, vi } from 'vitest'
import { AccountingSyncService } from '../src/accounting-sync/accounting-sync.service.js'

describe('AccountingSyncService batch worker', () => {
  it('uses the replica-safe lease claim', async () => {
    const repo = {
      claimPendingForRetry: vi.fn().mockResolvedValue([]),
    }
    const service = new AccountingSyncService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await service.batchReconcile()

    expect(repo.claimPendingForRetry).toHaveBeenCalledWith(100, 300)
  })
})
